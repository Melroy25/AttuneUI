"""Port of lib/attune-ui/rng.ts (mulberry32, Box-Muller, FNV-1a)."""
import math

MASK = 0xFFFFFFFF


class Rng:
    def __init__(self, seed):
        self.a = seed & MASK
        self.spare = None

    def next(self):
        self.a = (self.a + 0x6D2B79F5) & MASK
        t = self.a
        t = ((t ^ (t >> 15)) * (t | 1)) & MASK
        t ^= (t + (((t ^ (t >> 7)) * (t | 61)) & MASK)) & MASK
        return (t ^ (t >> 14)) / 4294967296

    def normal(self):
        if self.spare is not None:
            s, self.spare = self.spare, None
            return s
        r = math.sqrt(-2 * math.log(1 - self.next()))
        angle = 2 * math.pi * self.next()
        self.spare = r * math.sin(angle)
        return r * math.cos(angle)


def hash_string(s):
    h = 0x811C9DC5
    for ch in s:
        h = ((h ^ ord(ch)) * 0x01000193) & MASK
    return h
