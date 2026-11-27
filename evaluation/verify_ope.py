"""IPS, SNIPS, doubly robust value and effective sample size (mirrors lib/eval/ope.ts)."""
import math

import numpy as np

from verify_rng import Rng, hash_string

ARMS = ("baseline", "ergonomic", "disclosure", "shortcut", "guided")
DIM, FOLDS = 7, 5
V, EPSILON, DRAWS, T_REF_MS = 0.25, 0.1, 2000, 15_000
FRICTION = ("rage", "dead", "miss", "dwell", "thrash", "backtrack")


def is_number(v):
    return isinstance(v, (int, float)) and not isinstance(v, bool) and math.isfinite(v)


def eligible_arms(x):
    # features: bias, narrow, familiarity, dead, rage, miss, hesitation
    guided = x[2] < 0.6 and sum(x[3:7]) > 0
    return [a for a in ARMS if a != "guided" or guided]


def task_reward(p, changed):
    speed = min(T_REF_MS / p["timeMs"], 1) if p["success"] else 0
    calm = 1 - min(sum(p["friction"][k] for k in FRICTION) / 5, 1)
    r = 0.5 * p["success"] + 0.35 * speed + 0.15 * calm - (0.05 if changed else 0)
    return min(max(r, 0), 1)


def valid_task(p):
    return (isinstance(p, dict) and isinstance(p.get("success"), bool)
            and is_number(p.get("timeMs")) and p["timeMs"] > 0
            and isinstance(p.get("friction"), dict)
            and all(is_number(p["friction"].get(k)) and p["friction"][k] >= 0 for k in FRICTION))


def logged_rows(events, participants, phase):
    """`events` must already be de-duplicated and ordered by sequence number."""
    blocks = {}
    for e in events:
        blocks.setdefault((e["participant_id"], e["block"]), []).append(e)
    people = {p["id"]: p for p in participants if p["phase"] == phase}
    skipped = {"repeatDevice": 0, "incompleteBlocks": 0, "invalid": 0, "notRandomised": 0}
    rows = []
    for pid in sorted(people):
        person = people[pid]
        if person["repeat_device"]:
            skipped["repeatDevice"] += 1
            continue
        for block in sorted(b for i, b in blocks if i == pid):
            own = blocks[(pid, block)]
            decision = next((e for e in own if e["kind"] == "decision"), None)
            if decision is None:
                continue
            tasks = {}
            for e in own:
                if e["kind"] == "task" and isinstance(e["payload"], dict):
                    tasks[e["payload"].get("taskIndex")] = e["payload"]
            if len(tasks) != 3:
                skipped["incompleteBlocks"] += 1
                continue
            d = decision["payload"] if isinstance(decision["payload"], dict) else {}
            action, x = d.get("action"), d.get("context")
            if (action not in ARMS or not isinstance(x, list) or len(x) != DIM
                    or not all(is_number(v) and 0 <= v <= 1 for v in x)
                    or not all(valid_task(t) for t in tasks.values())
                    or person["pointer"] not in ("mouse", "touch", "pen")):
                skipped["invalid"] += 1
                continue
            probs = d.get("probs") if isinstance(d.get("probs"), dict) else {}
            support = all(is_number(probs.get(a)) and 0 < probs[a] < 1 for a in eligible_arms(x))
            p = probs.get(action)
            if not support or not is_number(p) or not 0 < p < 1:
                skipped["notRandomised"] += 1
                continue
            reward = sum(task_reward(t, action != "baseline") for t in tasks.values()) / 3
            rows.append({"id": pid, "block": block, "action": action, "x": np.array(x, float),
                         "modality": "coarse" if person["pointer"] == "touch" else "fine",
                         "p": p, "reward": reward})
    return rows, skipped


def reward_predictions(rows):
    """Ridge per modality and arm, cross-fitted over 5 participant folds."""
    sessions = sorted({r["id"] for r in rows})
    fold = {s: i % FOLDS for i, s in enumerate(sessions)}
    theta = {}
    for k in range(FOLDS):
        for modality in ("coarse", "fine"):
            for arm in ARMS:
                train = [r for r in rows if fold[r["id"]] != k
                         and r["modality"] == modality and r["action"] == arm]
                a, b = np.eye(DIM), np.zeros(DIM)
                for r in train:
                    a += np.outer(r["x"], r["x"])
                    b += r["reward"] * r["x"]
                theta[k, modality, arm] = np.linalg.solve(a, b)
    return [{arm: float(theta[fold[r["id"]], r["modality"], arm] @ r["x"]) for arm in ARMS}
            for r in rows]


def thompson(state, x, seed):
    eligible = eligible_arms(x)
    scores = []
    for arm in eligible:
        a_inv = np.array(state[arm]["aInv"])
        mean = float((a_inv @ np.array(state[arm]["b"])) @ x)
        scores.append((mean, V * math.sqrt(max(float(x @ (a_inv @ x)), 0))))
    rng, wins = Rng(seed), [0] * len(eligible)
    for _ in range(DRAWS):
        draws = [mean + sd * rng.normal() for mean, sd in scores]
        wins[draws.index(max(draws))] += 1
    probs = dict.fromkeys(ARMS, 0.0)
    for arm, w in zip(eligible, wins):
        probs[arm] = (1 - EPSILON) * (w / DRAWS) + EPSILON / len(eligible)
    return probs


def only(arm):
    return lambda r: {a: float(a == (arm if arm in eligible_arms(r["x"]) else "baseline")) for a in ARMS}


def uniform(r):
    eligible = eligible_arms(r["x"])
    return {a: (1 / len(eligible) if a in eligible else 0.0) for a in ARMS}


def evaluate(events, participants, phase, models=None):
    rows, skipped = logged_rows(events, participants, phase)
    predicted = reward_predictions(rows)
    targets = {f"always:{a}": only(a) for a in ARMS}
    targets["uniform"] = uniform
    if models:
        targets["policy"] = lambda r: thompson(
            models[r["modality"]], r["x"], hash_string(f"ope:{r['id']}:{r['block']}"))
    out = {}
    for name, target in targets.items():
        if not rows:
            out[name] = {"ips": None, "snips": None, "dr": None, "ess": 0}
            continue
        pis = [target(r) for r in rows]
        w = np.array([pi[r["action"]] / r["p"] for pi, r in zip(pis, rows)])
        reward = np.array([r["reward"] for r in rows])
        direct = np.array([sum(pi[a] * q[a] for a in ARMS) for pi, q in zip(pis, predicted)])
        logged = np.array([q[r["action"]] for q, r in zip(predicted, rows)])
        out[name] = {
            "ips": float(np.mean(w * reward)),
            "snips": float(w @ reward / w.sum()) if w.sum() > 0 else None,
            "dr": float(np.mean(direct + w * (reward - logged))),
            "ess": float(w.sum() ** 2 / (w @ w)) if w @ w > 0 else 0,
        }
    return {
        "phase": phase,
        "n": len(rows),
        "skipped": skipped,
        "meanLoggedReward": float(np.mean([r["reward"] for r in rows])) if rows else None,
        "targets": out,
    }
