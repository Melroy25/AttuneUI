"""Independent re-computation of lib/eval/stats.ts and lib/eval/ope.ts from a study export.

python evaluation/verify_results.py export.json [more.json ...] [--policy data/policy.frozen.json]
Prints JSON. The seeded generator is ported from lib/attune-ui/rng.ts, so permutation
p-values, bootstrap intervals and policy probabilities match the app exactly (to rounding).
"""
import argparse
import json
import math

import numpy as np
from scipy.stats import mannwhitneyu

from verify_ope import evaluate
from verify_rng import Rng

SEED, RESAMPLES, CAP_MS = 2026, 10_000, 90_000
ARMS = ("A", "B", "C")


def is_number(v):
    return isinstance(v, (int, float)) and not isinstance(v, bool) and math.isfinite(v)


def dedupe(events):
    """Retried uploads repeat rows; the last copy wins, ordered by sequence number."""
    rows = {(e["participant_id"], e["seq"]): e for e in events}
    return sorted(rows.values(), key=lambda e: e["seq"])


def block_total(rows):
    tasks = {}
    for e in rows:
        p = e["payload"]
        if e["kind"] != "task" or not isinstance(p, dict) or p.get("taskIndex") not in (0, 1, 2):
            continue
        t, ok = p.get("timeMs"), p.get("success")
        if not isinstance(ok, bool) or not is_number(t) or t <= 0:
            tasks[p["taskIndex"]] = None
        else:
            tasks[p["taskIndex"]] = min(t, CAP_MS) if ok else CAP_MS
    times = [tasks.get(i) for i in range(3)]
    return None if None in times else sum(times)


def subjects(log, phase):
    by_person = {}
    for e in dedupe(log["events"]):
        by_person.setdefault(e["participant_id"], []).append(e)
    people = {p["id"]: p for p in log["participants"]}
    ex = {"otherPhase": 0, "unknownArm": 0}
    for key in ("repeatDevice", "incomplete", "offline"):
        ex[key] = dict.fromkeys(ARMS, 0)
    main, offline = [], []
    for pid in sorted(people):
        p = people[pid]
        if p["phase"] != phase:
            ex["otherPhase"] += 1
            continue
        arm = p.get("arm")
        if arm not in ARMS:
            ex["unknownArm"] += 1
            continue
        if p["repeat_device"]:
            ex["repeatDevice"][arm] += 1
            continue
        own = by_person.get(pid, [])
        first = block_total([e for e in own if e["block"] == 1])
        second = block_total([e for e in own if e["block"] == 2])
        decided = any(e["block"] == 2 and e["kind"] == "decision" for e in own)
        if first is None or second is None or not decided:
            ex["incomplete"][arm] += 1
            continue
        s = {"arm": arm, "stratum": p["pointer"], "x": math.log(first), "y": math.log(second)}
        if p["offline"]:
            ex["offline"][arm] += 1
            offline.append(s)
        else:
            main.append(s)
    return main, offline, ex


def permutation_p(values, treated, strata, resamples):
    values, treated = np.array(values), np.array(treated)
    groups = [[i for i, s in enumerate(strata) if s == k] for k in sorted(set(strata))]

    def diff(labels):
        return values[labels].mean() - values[~labels].mean()

    observed, rng, hits = abs(diff(treated)), Rng(SEED), 0
    for _ in range(resamples):
        labels = treated.tolist()
        for idx in groups:
            for i in range(len(idx) - 1, 0, -1):
                j = int(rng.next() * (i + 1))
                labels[idx[i]], labels[idx[j]] = labels[idx[j]], labels[idx[i]]
        hits += abs(diff(np.array(labels))) >= observed - 1e-12
    return (int(hits) + 1) / (resamples + 1)


def bootstrap_ci(a, b, resamples):
    rng = Rng(SEED)

    def draw(v):
        return sum(v[int(rng.next() * len(v))] for _ in v) / len(v)

    diffs = [draw(a) - draw(b) for _ in range(resamples)]
    return np.quantile(diffs, [0.025, 0.975]).tolist()


def hedges_g(a, b):
    df = len(a) + len(b) - 2
    sd = math.sqrt(((len(a) - 1) * np.var(a, ddof=1) + (len(b) - 1) * np.var(b, ddof=1)) / df)
    return float((np.mean(a) - np.mean(b)) / sd * (1 - 3 / (4 * df - 1))) if sd > 0 else None


def holm(ps):
    order = sorted((i for i, p in enumerate(ps) if p is not None), key=lambda i: ps[i])
    out, running = [None] * len(ps), 0.0
    for rank, i in enumerate(order):
        running = max(running, min((len(order) - rank) * ps[i], 1.0))
        out[i] = running
    return out


def analyse(log, phase="confirmatory", resamples=RESAMPLES):
    main, offline, exclusions = subjects(log, phase)
    theta, adjusted = 0.0, []
    if main:
        x = np.array([s["x"] for s in main])
        y = np.array([s["y"] for s in main])
        dx = x - x.mean()
        theta = float(dx @ (y - y.mean()) / (dx @ dx)) if dx @ dx > 0 else 0.0
        adjusted = (y - theta * dx).tolist()
    contrasts = []
    for first, second in (("C", "A"), ("C", "B")):
        picked = [i for i, s in enumerate(main) if s["arm"] in (first, second)]
        a = [adjusted[i] for i in picked if main[i]["arm"] == first]
        b = [adjusted[i] for i in picked if main[i]["arm"] == second]
        ok, enough = bool(a and b), len(a) > 1 and len(b) > 1
        difference = float(np.mean(a) - np.mean(b)) if ok else None
        mw = None
        if ok:
            r = mannwhitneyu(a, b, alternative="two-sided", method="asymptotic")
            mw = {"u": float(r.statistic), "p": None if math.isnan(r.pvalue) else float(r.pvalue)}
        contrasts.append({
            "name": f"{first}-{second}",
            "n": [len(a), len(b)],
            "difference": difference,
            "timeRatio": math.exp(difference) if ok else None,
            "hedgesG": hedges_g(a, b) if enough else None,
            "ci95": bootstrap_ci(a, b, resamples) if enough else None,
            "p": permutation_p([adjusted[i] for i in picked],
                               [main[i]["arm"] == first for i in picked],
                               [main[i]["stratum"] for i in picked], resamples) if ok else None,
            "mannWhitney": mw,
        })
    for c, p in zip(contrasts, holm([c["p"] for c in contrasts])):
        c["pHolm"] = p
    off = {arm: [s["y"] for s in offline if s["arm"] == arm] for arm in ARMS}
    return {
        "phase": phase,
        "n": {arm: sum(s["arm"] == arm for s in main) for arm in ARMS},
        "theta": theta,
        "exclusions": exclusions,
        "offlineMeanLogBlock2": {a: float(np.mean(v)) if v else None for a, v in off.items()},
        "contrasts": contrasts,
    }


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("exports", nargs="+")
    parser.add_argument("--policy", help="frozen or prior policy file to evaluate off-policy")
    parser.add_argument("--resamples", type=int, default=RESAMPLES)
    args = parser.parse_args()
    log = {"participants": [], "events": []}
    provenance = []
    for path in args.exports:
        with open(path, encoding="utf-8") as f:
            data = json.load(f)
        log["participants"] += data["participants"]
        log["events"] += data["events"]
        provenance.append(data.get("provenance", "study export"))
    models = None
    if args.policy:
        with open(args.policy, encoding="utf-8") as f:
            models = json.load(f)["models"]
    print(json.dumps({
        "provenance": sorted(set(provenance)),
        "stats": analyse(log, resamples=args.resamples),
        # Phases are never pooled.
        "ope": {phase: evaluate(dedupe(log["events"]), log["participants"], phase, models)
                for phase in ("pilot", "confirmatory")},
    }, indent=1))


if __name__ == "__main__":
    main()
