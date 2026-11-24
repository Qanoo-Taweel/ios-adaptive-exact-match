# Validation results

Machine: Intel(R) Xeon(R) Processor @ 2.10GHz (4 cores), Node v22.23.5, linux 6.18.44-fc-v819. Generated 2026-11-24T14:09:32.165Z.
Each time = median of 3 runs after 1 warm-up run (construct atom + process all records + consume all matches).

## Set V: 120 multi-pattern cases (unseen seeds, between-grid values, 3 unseen alphabets)

| Policy | Picks fastest | Within 10 % | Geo-mean slowdown | Worst slowdown | Total / best total |
|---|---:|---:|---:|---:|---:|
| ExactMatch (auto) | 70.0 % | 77.5 % | 1.097 | 3.27× (V66) | 1.092 |
| always WuManberSearch | 67.5 % | 76.7 % | 1.136 | 3.34× (V51) | 1.058 |
| always Bm4DnaHmbsSearch | 15.0 % | 17.5 % | 1.965 | 14.60× (V100) | 2.551 |
| always AhoCorasickSearch | 9.2 % | 10.8 % | 2.244 | 22.44× (V112) | 2.375 |
| Allmer 2016 rule | 15.0 % | 17.5 % | 2.458 | 45.64× (V33) | 5.372 |
| ExactMatch end-to-end (measured, incl. decision) | – | – | 2.805 | 10.24× | 2.248 |
| always BoyerMooreSearch | 2.5 % | 3.3 % | 4.952 | 69.86× (V108) | 11.171 |
| always Bm4DnaDsSearch | 5.0 % | 7.5 % | 5.191 | 70.37× (V108) | 14.052 |
| always HorspoolSearch | 0.8 % | 5.0 % | 5.672 | 69.63× (V108) | 15.714 |
| always ShiftOrSearch | 0.0 % | 0.8 % | 10.787 | 114.65× (V80) | 24.305 |
| always SuffixArraySearch | 0.0 % | 0.0 % | 17.006 | 79.25× (V53) | 32.428 |
| always RabinKarpSearch | 0.0 % | 0.0 % | 17.779 | 199.96× (V100) | 42.421 |
| always FmIndexSearch | 0.0 % | 0.0 % | 19.820 | 90.29× (V80) | 34.830 |
| always KmpSearch | 0.0 % | 0.0 % | 26.518 | 262.35× (V108) | 57.178 |

## Set S: 40 single-pattern cases

| Policy | Picks fastest | Within 10 % | Geo-mean slowdown | Worst slowdown | Total / best total |
|---|---:|---:|---:|---:|---:|
| ExactMatch (auto) | 50.0 % | 77.5 % | 1.072 | 1.62× (S38) | 1.066 |
| always Bm4DnaHmbsSearch | 47.5 % | 67.5 % | 1.135 | 2.06× (S39) | 1.194 |
| Allmer 2016 rule | 37.5 % | 67.5 % | 1.172 | 3.60× (S15) | 1.301 |
| always WuManberSearch | 20.0 % | 47.5 % | 1.315 | 6.54× (S39) | 1.222 |
| always BoyerMooreSearch | 7.5 % | 20.0 % | 1.439 | 2.58× (S18) | 1.790 |
| always Bm4DnaDsSearch | 10.0 % | 37.5 % | 1.456 | 4.40× (S27) | 1.781 |
| always HorspoolSearch | 15.0 % | 35.0 % | 1.515 | 5.04× (S27) | 1.868 |
| always ShiftOrSearch | 0.0 % | 0.0 % | 2.108 | 3.09× (S13) | 2.130 |
| always RabinKarpSearch | 0.0 % | 0.0 % | 2.422 | 4.94× (S28) | 2.771 |
| always AhoCorasickSearch | 0.0 % | 0.0 % | 2.733 | 4.50× (S7) | 3.128 |
| ExactMatch end-to-end (measured, incl. decision) | – | – | 3.382 | 11.60× | 2.621 |
| always KmpSearch | 0.0 % | 0.0 % | 3.666 | 8.08× (S18) | 4.443 |
| always SuffixArraySearch | 0.0 % | 0.0 % | 29.760 | 104.18× (S18) | 57.159 |
| always FmIndexSearch | 0.0 % | 0.0 % | 31.927 | 108.54× (S18) | 57.171 |

## Set R: 24 real-data cases (lambda phage, E. coli proteins)

| Policy | Picks fastest | Within 10 % | Geo-mean slowdown | Worst slowdown | Total / best total |
|---|---:|---:|---:|---:|---:|
| always WuManberSearch | 50.0 % | 62.5 % | 1.231 | 4.00× (R23) | 1.541 |
| always AhoCorasickSearch | 8.3 % | 20.8 % | 1.713 | 3.20× (R4) | 1.601 |
| ExactMatch (auto) | 54.2 % | 66.7 % | 1.832 | 13.34× (R7) | 4.469 |
| always RabinKarpSearch | 0.0 % | 0.0 % | 2.638 | 6.15× (R19) | 2.522 |
| always Bm4DnaHmbsSearch | 25.0 % | 25.0 % | 3.002 | 25.05× (R22) | 7.629 |
| Allmer 2016 rule | 25.0 % | 25.0 % | 3.359 | 44.43× (R14) | 9.546 |
| always Bm4DnaDsSearch | 12.5 % | 16.7 % | 3.637 | 44.43× (R14) | 9.644 |
| always HorspoolSearch | 0.0 % | 12.5 % | 3.755 | 49.39× (R14) | 10.299 |
| ExactMatch end-to-end (measured, incl. decision) | – | – | 4.006 | 15.32× | 6.258 |
| always BoyerMooreSearch | 0.0 % | 4.2 % | 4.205 | 59.75× (R14) | 12.666 |
| always ShiftOrSearch | 4.2 % | 4.2 % | 4.349 | 33.61× (R14) | 8.737 |
| always KmpSearch | 0.0 % | 0.0 % | 12.686 | 190.29× (R14) | 39.543 |
| always SuffixArraySearch | 0.0 % | 0.0 % | 14.524 | 41.22× (R2) | 12.521 |
| always FmIndexSearch | 0.0 % | 0.0 % | 16.913 | 38.90× (R5) | 14.989 |

## All 184 cases

| Policy | Picks fastest | Within 10 % | Geo-mean slowdown | Worst slowdown | Total / best total |
|---|---:|---:|---:|---:|---:|
| ExactMatch (auto) | 63.6 % | 76.1 % | 1.167 | 13.34× (R7) | 1.302 |
| always WuManberSearch | 54.9 % | 68.5 % | 1.185 | 6.54× (S39) | 1.119 |
| always Bm4DnaHmbsSearch | 23.4 % | 29.3 % | 1.843 | 25.05× (R22) | 2.627 |
| Allmer 2016 rule | 21.2 % | 29.3 % | 2.180 | 45.64× (V33) | 4.896 |
| always AhoCorasickSearch | 7.1 % | 9.8 % | 2.261 | 22.44× (V112) | 2.463 |
| ExactMatch end-to-end (measured, incl. decision) | – | – | 3.060 | 15.32× | 2.571 |
| always BoyerMooreSearch | 3.3 % | 7.1 % | 3.705 | 69.86× (V108) | 9.557 |
| always Bm4DnaDsSearch | 7.1 % | 15.2 % | 3.759 | 70.37× (V108) | 11.536 |
| always HorspoolSearch | 3.8 % | 12.5 % | 4.034 | 69.63× (V108) | 12.847 |
| always ShiftOrSearch | 0.5 % | 1.1 % | 6.719 | 114.65× (V80) | 19.274 |
| always RabinKarpSearch | 0.0 % | 0.0 % | 8.987 | 199.96× (V100) | 32.656 |
| always KmpSearch | 0.0 % | 0.0 % | 15.666 | 262.35× (V108) | 46.447 |
| always SuffixArraySearch | 0.0 % | 0.0 % | 18.815 | 104.18× (S18) | 35.666 |
| always FmIndexSearch | 0.0 % | 0.0 % | 21.535 | 108.54× (S18) | 37.637 |

## Worst ExactMatch choices (all sets)

| Case | Alphabet | n | k | m range | Fastest | Chosen | Slowdown |
|---|---|---:|---:|---|---|---|---:|
| R7 | ecoli | 207 | 1 | 150–150 | Bm4DnaHmbsSearch (0.36 ms) | SuffixArraySearch (4.74 ms) | 13.34× |
| R11 | ecoli | 207 | 20 | 10–10 | WuManberSearch (0.32 ms) | SuffixArraySearch (3.94 ms) | 12.17× |
| R19 | ecoli | 207 | 30 | 25–25 | WuManberSearch (0.38 ms) | SuffixArraySearch (4.01 ms) | 10.60× |
| R3 | ecoli | 207 | 1 | 20–20 | Bm4DnaDsSearch (0.55 ms) | SuffixArraySearch (5.78 ms) | 10.50× |
| R15 | ecoli | 207 | 200 | 12–12 | WuManberSearch (0.97 ms) | SuffixArraySearch (8.42 ms) | 8.69× |
| R23 | ecoli | 207 | 100 | 6–6 | AhoCorasickSearch (1.09 ms) | SuffixArraySearch (6.01 ms) | 5.51× |
| V66 | dna | 72644 | 60 | 14–31 | WuManberSearch (0.37 ms) | AhoCorasickSearch (1.21 ms) | 3.27× |
| V9 | binary | 159797 | 10 | 27–47 | WuManberSearch (0.70 ms) | AhoCorasickSearch (1.78 ms) | 2.56× |
| V27 | binary | 209700 | 35 | 57–130 | WuManberSearch (1.22 ms) | AhoCorasickSearch (2.47 ms) | 2.03× |
| V115 | protein | 119069 | 15 | 59–127 | WuManberSearch (0.35 ms) | Bm4DnaHmbsSearch (0.69 ms) | 1.94× |

Decision time (shape + all estimates): median 0.585 ms, max 4.865 ms.
