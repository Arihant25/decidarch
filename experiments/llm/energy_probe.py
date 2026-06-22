#!/usr/bin/env python3
# ============================================================
# DecidArch LLM experiment — GPU energy/power probe (pynvml)
# ============================================================
# Reads whole-GPU cumulative energy and instantaneous power on the
# DGX Spark (GB10) via NVML. The orchestrator brackets each game with
# two `read` calls; energy_used_J = (energy_mj_end - energy_mj_start)/1000.
#
# Subcommands:
#   read                 -> one JSON line: {energy_mj, power_mw, t, gpus}
#   baseline --secs N    -> average power over N seconds (exclusivity gate)
#
# Energy is summed across all visible GPUs (the Spark has one).
import argparse
import json
import time
import sys

try:
    import pynvml
except Exception as e:  # pragma: no cover
    print(json.dumps({"error": f"pynvml import failed: {e}"}))
    sys.exit(1)


def handles():
    pynvml.nvmlInit()
    n = pynvml.nvmlDeviceGetCount()
    return [pynvml.nvmlDeviceGetHandleByIndex(i) for i in range(n)]


def read_once(hs):
    energy_mj = 0
    power_mw = 0
    for h in hs:
        try:
            energy_mj += pynvml.nvmlDeviceGetTotalEnergyConsumption(h)
        except pynvml.NVMLError:
            pass
        try:
            power_mw += pynvml.nvmlDeviceGetPowerUsage(h)
        except pynvml.NVMLError:
            pass
    return energy_mj, power_mw


def main():
    ap = argparse.ArgumentParser()
    sub = ap.add_subparsers(dest="cmd", required=True)
    sub.add_parser("read")
    b = sub.add_parser("baseline")
    b.add_argument("--secs", type=float, default=3.0)
    args = ap.parse_args()

    hs = handles()

    if args.cmd == "read":
        energy_mj, power_mw = read_once(hs)
        print(json.dumps({"energy_mj": energy_mj, "power_mw": power_mw, "t": time.time(), "gpus": len(hs)}))
    elif args.cmd == "baseline":
        samples = []
        end = time.time() + args.secs
        while time.time() < end:
            _, p = read_once(hs)
            samples.append(p)
            time.sleep(0.2)
        avg = sum(samples) / len(samples) if samples else 0
        print(json.dumps({"avg_power_mw": avg, "peak_power_mw": max(samples) if samples else 0, "n": len(samples)}))


if __name__ == "__main__":
    main()
