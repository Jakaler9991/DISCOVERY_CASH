#!/usr/bin/env python3
"""Convert an .xlsx file to per-sheet 'RAINBOW' CSVs and produce a JSON summary.

Usage:
  python3 scripts/xlsx_to_rainbow_csv.py /path/to/input.xlsx --outdir outputs/rainbow_csv

Produces:
  - outputs/rainbow_csv/RAINBOW_<sheetname>.csv
  - outputs/rainbow_csv/summary.json

If pandas/openpyxl are missing, the script prints instructions to install them.
"""
import argparse
import os
import json
import sys

try:
    import pandas as pd
except Exception:
    print("This script requires pandas and openpyxl. Install with:\n  python3 -m pip install pandas openpyxl")
    sys.exit(2)


def safe_sheet_name(name):
    # sanitize sheet names for filenames
    return ''.join(c if c.isalnum() or c in (' ', '-', '_') else '_' for c in name).strip().replace(' ', '_')


def summarize_df(df):
    summary = {
        'rows': int(df.shape[0]),
        'cols': int(df.shape[1])
    }
    # numeric summaries
    num_cols = df.select_dtypes(include=['number']).columns.tolist()
    stats = {}
    for c in num_cols:
        ser = df[c].dropna()
        if ser.empty:
            continue
        stats[c] = {
            'min': float(ser.min()),
            'max': float(ser.max()),
            'mean': float(ser.mean())
        }
    if stats:
        summary['numeric_stats'] = stats
    return summary


def main():
    p = argparse.ArgumentParser()
    p.add_argument('xlsx', help='Input .xlsx file')
    p.add_argument('--outdir', default='outputs/rainbow_csv')
    args = p.parse_args()

    if not os.path.isfile(args.xlsx):
        print(f"Input file not found: {args.xlsx}")
        sys.exit(1)

    os.makedirs(args.outdir, exist_ok=True)

    xls = pd.ExcelFile(args.xlsx, engine='openpyxl')
    summary = {'sheets': {}}

    for sheet in xls.sheet_names:
        df = xls.parse(sheet)
        fname = f"RAINBOW_{safe_sheet_name(sheet)}.csv"
        outpath = os.path.join(args.outdir, fname)
        df.to_csv(outpath, index=False)
        summary['sheets'][sheet] = summarize_df(df)
        print(f"Wrote {outpath} ({df.shape[0]} rows x {df.shape[1]} cols)")

    summary_path = os.path.join(args.outdir, 'summary.json')
    with open(summary_path, 'w') as f:
        json.dump(summary, f, indent=2)

    print(f"Summary written to {summary_path}")


if __name__ == '__main__':
    main()
