# Validation results

Machine: Intel(R) Xeon(R) Processor @ 2.10GHz (4 cores), Node v22.23.5, linux 6.18.44-fc-v819. Generated 2026-11-24T14:24:22.627Z.
Each time = median of 3 runs after 1 warm-up run (construct atom + process all records + consume all matches).

## Set V: 120 multi-pattern cases (unseen seeds, between-grid values, 3 unseen alphabets)

| Policy | Picks fastest | Within 10 % | Geo-mean slowdown | Worst slowdown | Total / best total |
|---|---:|---:|---:|---:|---:|
| ExactMatch (auto) | 77.5 % | 82.5 % | 1.094 | 7.36× (V87) | 1.052 |
| always WuManberSearch | 69.2 % | 74.2 % | 1.152 | 5.20× (V51) | 1.070 |
| ExactMatch end-to-end (measured, incl. decision) | – | – | 1.692 | 8.15× | 1.349 |
| always Bm4DnaHmbsSearch | 15.0 % | 15.8 % | 2.069 | 12.10× (V100) | 2.914 |
| always AhoCorasickSearch | 12.5 % | 16.7 % | 2.183 | 20.56× (V112) | 2.508 |
| Allmer 2016 rule | 13.3 % | 14.2 % | 2.621 | 52.76× (V33) | 5.974 |
| always BoyerMooreSearch | 0.0 % | 0.8 % | 5.296 | 75.83× (V108) | 12.234 |
| always Bm4DnaDsSearch | 0.8 % | 1.7 % | 5.439 | 64.61× (V108) | 14.665 |
| always HorspoolSearch | 2.5 % | 3.3 % | 5.750 | 71.96× (V108) | 16.739 |
| always ShiftOrSearch | 0.0 % | 0.0 % | 10.462 | 114.36× (V100) | 22.691 |
| always SuffixArraySearch | 0.0 % | 0.0 % | 17.308 | 69.93× (V119) | 33.297 |
| always RabinKarpSearch | 0.0 % | 0.0 % | 18.300 | 195.50× (V1) | 42.862 |
| always FmIndexSearch | 0.0 % | 0.0 % | 20.807 | 79.77× (V13) | 37.361 |
| always KmpSearch | 0.0 % | 0.0 % | 23.684 | 250.66× (V1) | 51.444 |

## Set S: 40 single-pattern cases

| Policy | Picks fastest | Within 10 % | Geo-mean slowdown | Worst slowdown | Total / best total |
|---|---:|---:|---:|---:|---:|
| ExactMatch (auto) | 57.5 % | 75.0 % | 1.095 | 2.38× (S26) | 1.097 |
| always Bm4DnaHmbsSearch | 52.5 % | 65.0 % | 1.122 | 2.38× (S26) | 1.085 |
| Allmer 2016 rule | 50.0 % | 62.5 % | 1.165 | 3.73× (S9) | 1.218 |
| always WuManberSearch | 22.5 % | 37.5 % | 1.377 | 6.26× (S3) | 1.236 |
| always BoyerMooreSearch | 2.5 % | 17.5 % | 1.421 | 2.38× (S18) | 1.650 |
| always Bm4DnaDsSearch | 10.0 % | 35.0 % | 1.524 | 4.46× (S21) | 1.674 |
| always HorspoolSearch | 12.5 % | 32.5 % | 1.614 | 5.10× (S15) | 1.916 |
| ExactMatch end-to-end (measured, incl. decision) | – | – | 1.812 | 4.93× | 1.359 |
| always ShiftOrSearch | 0.0 % | 0.0 % | 2.160 | 4.33× (S28) | 2.566 |
| always RabinKarpSearch | 0.0 % | 0.0 % | 2.561 | 5.39× (S28) | 3.095 |
| always AhoCorasickSearch | 0.0 % | 0.0 % | 2.893 | 5.19× (S38) | 2.984 |
| always KmpSearch | 0.0 % | 0.0 % | 3.431 | 6.15× (S27) | 4.148 |
| always SuffixArraySearch | 0.0 % | 0.0 % | 31.037 | 94.64× (S1) | 55.590 |
| always FmIndexSearch | 0.0 % | 0.0 % | 34.980 | 96.57× (S27) | 59.952 |

## Set R: 24 real-data cases (lambda phage, E. coli proteins)

| Policy | Picks fastest | Within 10 % | Geo-mean slowdown | Worst slowdown | Total / best total |
|---|---:|---:|---:|---:|---:|
| ExactMatch (auto) | 70.8 % | 79.2 % | 1.100 | 3.29× (R7) | 1.134 |
| always WuManberSearch | 41.7 % | 50.0 % | 1.224 | 3.14× (R7) | 1.287 |
| ExactMatch end-to-end (measured, incl. decision) | – | – | 1.471 | 3.53× | 1.576 |
| always AhoCorasickSearch | 20.8 % | 20.8 % | 1.690 | 6.74× (R3) | 1.674 |
| always RabinKarpSearch | 0.0 % | 0.0 % | 2.822 | 5.82× (R17) | 2.734 |
| always Bm4DnaHmbsSearch | 20.8 % | 20.8 % | 3.260 | 29.20× (R14) | 8.061 |
| Allmer 2016 rule | 8.3 % | 8.3 % | 3.684 | 58.27× (R14) | 10.176 |
| always Bm4DnaDsSearch | 4.2 % | 4.2 % | 3.689 | 58.27× (R14) | 10.141 |
| always HorspoolSearch | 8.3 % | 8.3 % | 4.064 | 80.81× (R14) | 12.081 |
| always ShiftOrSearch | 4.2 % | 4.2 % | 4.197 | 40.29× (R14) | 9.158 |
| always BoyerMooreSearch | 0.0 % | 12.5 % | 4.458 | 105.67× (R14) | 15.155 |
| always KmpSearch | 0.0 % | 0.0 % | 11.038 | 199.15× (R14) | 34.636 |
| always SuffixArraySearch | 0.0 % | 0.0 % | 15.366 | 37.56× (R5) | 13.634 |
| always FmIndexSearch | 0.0 % | 0.0 % | 17.540 | 68.45× (R5) | 15.777 |

## All 184 cases

| Policy | Picks fastest | Within 10 % | Geo-mean slowdown | Worst slowdown | Total / best total |
|---|---:|---:|---:|---:|---:|
| ExactMatch (auto) | 72.3 % | 80.4 % | 1.095 | 7.36× (V87) | 1.066 |
| always WuManberSearch | 55.4 % | 63.0 % | 1.207 | 6.26× (S3) | 1.116 |
| ExactMatch end-to-end (measured, incl. decision) | – | – | 1.686 | 8.15× | 1.364 |
| always Bm4DnaHmbsSearch | 23.9 % | 27.2 % | 1.922 | 29.20× (R14) | 2.859 |
| always AhoCorasickSearch | 10.9 % | 13.6 % | 2.244 | 20.56× (V112) | 2.553 |
| Allmer 2016 rule | 20.7 % | 23.9 % | 2.298 | 58.27× (R14) | 5.282 |
| always BoyerMooreSearch | 0.5 % | 6.0 % | 3.891 | 105.67× (R14) | 10.308 |
| always Bm4DnaDsSearch | 3.3 % | 9.2 % | 3.921 | 64.61× (V108) | 11.817 |
| always HorspoolSearch | 5.4 % | 10.3 % | 4.169 | 80.81× (R14) | 13.519 |
| always ShiftOrSearch | 0.5 % | 0.5 % | 6.591 | 114.36× (V100) | 17.888 |
| always RabinKarpSearch | 0.0 % | 0.0 % | 9.352 | 195.50× (V1) | 32.570 |
| always KmpSearch | 0.0 % | 0.0 % | 14.087 | 250.66× (V1) | 41.054 |
| always SuffixArraySearch | 0.0 % | 0.0 % | 19.349 | 94.64× (S1) | 36.543 |
| always FmIndexSearch | 0.0 % | 0.0 % | 22.782 | 96.57× (S27) | 40.551 |

## Worst ExactMatch choices (all sets)

| Case | Alphabet | n | k | m range | Fastest | Chosen | Slowdown |
|---|---|---:|---:|---|---|---|---:|
| V87 | binary | 32676 | 5 | 36–75 | Bm4DnaHmbsSearch (0.16 ms) | RabinKarpSearch (1.20 ms) | 7.36× |
| R7 | ecoli | 207 | 1 | 150–150 | Bm4DnaDsSearch (0.28 ms) | HorspoolSearch (0.92 ms) | 3.29× |
| S26 | text | 8059 | 1 | 44–44 | BoyerMooreSearch (0.04 ms) | Bm4DnaHmbsSearch (0.09 ms) | 2.38× |
| V76 | alnum | 7371 | 3 | 90–145 | HorspoolSearch (0.04 ms) | Bm4DnaDsSearch (0.08 ms) | 2.07× |
| V63 | binary | 41085 | 85 | 71–164 | AhoCorasickSearch (0.71 ms) | WuManberSearch (1.37 ms) | 1.94× |
| V35 | rna | 8105 | 7 | 22–43 | AhoCorasickSearch (0.07 ms) | WuManberSearch (0.14 ms) | 1.92× |
| V117 | binary | 38764 | 94 | 69–159 | AhoCorasickSearch (0.66 ms) | WuManberSearch (1.24 ms) | 1.89× |
| V115 | protein | 119069 | 15 | 59–127 | WuManberSearch (0.36 ms) | Bm4DnaHmbsSearch (0.65 ms) | 1.80× |
| R5 | ecoli | 52676 | 1 | 60–60 | WuManberSearch (0.11 ms) | Bm4DnaHmbsSearch (0.19 ms) | 1.69× |
| V86 | text | 18890 | 5 | 59–111 | Bm4DnaDsSearch (0.08 ms) | Bm4DnaHmbsSearch (0.13 ms) | 1.69× |

Decision time (shape + all estimates): median 0.218 ms, max 1.687 ms.
