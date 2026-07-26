# VIP Floor Gate C v11 candidate HMAC/adoption preauthorization audit

Captured: 2026-07-22 JST

## Decision

Candidate 2 remains byte-exact and structurally safe, but the current Owner authority stops before the private known-secret scan, candidate adoption, reviewer dispatch, or provider access. No such operation was performed in this audit.

The next implementation must add a dedicated, bounded scanner. Existing recovery code contains general HMAC primitives but does not provide an exhaustive, streaming exact-value leak scanner for the frozen provider closure.

## Exact current boundary

- Immutable ancestor terminal SHA-256: `e2b41810c2f068f747ee138412a2053da79aa8d052b45523957eff129fea3e16`
- Candidate checkpoint SHA-256: `92d439b592b3a8e70458776442717a1e6ca1ec8df945c36bce7073b84e685597`
- Artifact SHA-256 / files: `5796deeea2f6b250d66ec388c66f1fa8d4588bb153536d5d1adb2c1bd7aad5f9` / 2,380
- Provider-comparable SHA-256 / files: `038f01c5a36b0387d27a2ebc6d5fde30308c94a233af134da32f856a304712cf` / 2,701
- Workspace source SHA-256 / files: `7f6b2dc10710c679496fcf4e8c253aab598529179df932a9900ec2243c267626` / 225
- Migration bundle SHA-256 / files: `c2e751f183b8fb35e5bcf468366622b9f19298d6c5c8e086702f9b1a5f193272` / 31
- Private candidate tree: 2,702 files, 1,050 directories, zero symlinks, zero hardlinks, zero wrong owner/mode entries, and zero special files
- V11 terminal state: `OPEN`, continuation terminals 0
- Secret reads, adopted boundaries, reviewer dispatches, provider API calls, external calls, external mutations, and deployments: all 0

The additive authorization proposal is:

- Path: `docs/evidence/vip-floor-v2/gate-c-to-e-continuation-v11-candidate-adoption-review-continuation-authorization-proposal-v3-20260722.json`
- SHA-256: `0225f9fb8879248def06c8ff5b2ccb4997ca0ab764febd553f70c13cf71543fa`

That proposal is not self-authorizing.

## Required permission-tightening contract

After exact Owner authorization, the scanner must apply the one permitted permission tightening before reading the identified local environment file:

1. Resolve the exact repository-relative target without globs, environment-variable expansion, or caller-selected paths.
2. Reject a symlink at the file or any parent component.
3. Require a current-user-owned regular file with link count 1 and current mode `0644` or already-safe mode `0600`.
4. Journal a local permission-tightening intent before `chmod`.
5. Change only the permission bits to `0600`; content mutation and deletion remain prohibited.
6. Re-open with `O_NOFOLLOW`, then verify descriptor and path identity using device, inode, owner, regular-file type, link count, size, and timestamps.
7. Count at most one authorized secret-file read. Do not inherit or inspect unrelated credentials.

The public receipt may report only structural state and aggregate counters. It must not include the file path, key names, values, value lengths tied to individual keys, digests of secret values, ciphertext, or raw parser errors containing input.

## Required exact-value scan contract

The implementation must scan the entire immutable candidate closure, including the private project-binding file, without loading the multi-gigabyte tree into memory.

### Secret-value classification

- Parse environment assignments locally after the authorized read.
- Reject duplicate keys, malformed quoting, NUL bytes, unsupported multiline syntax, or ambiguous escape handling rather than guessing.
- Select only non-empty values belonging to explicitly secret-bearing keys such as secret, token, password, private key, API key, access key, signing secret, or webhook secret classes.
- Reject an empty selected set. Do not silently treat a parser failure as zero known secrets.
- Deduplicate exact byte values in memory without outputting them.
- Zero or release secret buffers as soon as practical after the scan.

### Candidate traversal

- Obtain the candidate only through the frozen private locator and exact checkpoint binding.
- Revalidate the candidate root, locator, checkpoint, artifact, provider-comparable manifest, workspace source, migration bundle, and V11 OPEN state before the secret read.
- Traverse lexicographically and require every directory to be current-user-owned mode `0700` and every file to be a current-user-owned regular file, mode `0600`, link count 1.
- Open every file with `O_NOFOLLOW` and verify pre/open/post device and inode identity, link count, owner, size, modification time, and change time.
- Use bounded streaming chunks. Retain an overlap of `maximumSecretByteLength - 1` so an exact value spanning two chunks cannot evade detection.
- Count every regular entry. Require the scanned file set to equal the exact 2,702-file candidate set and the provider set to remain exactly 2,701 entries.
- Treat read errors, concurrent drift, file-set changes, short reads, special files, or unknown outcomes as a failed scan that consumes the authorized attempt and produces `GATE_C_HOLD`.

### HMAC use and evidence

- Generate an ephemeral random HMAC key of at least 32 bytes inside the process.
- HMAC may be used for in-process deduplication or private comparison bookkeeping, but the key, secret HMACs, match HMACs, and secret-derived digests must never enter public evidence.
- Exact byte matching is authoritative for leak detection; HMAC metadata must not replace exhaustive byte scanning or permit collision-based acceptance.
- Public evidence may contain only secret-value count, scanned file/byte counts, match count, structural violation counts, and a boolean pass decision.
- Adoption requires exact-value match count 0. Any match rejects the candidate without publishing the matching path or value.

## Required negative and positive fixtures

The scanner must pass synthetic fixtures before it may touch the real secret file:

1. exact secret as a complete file;
2. secret embedded at file start, middle, and end;
3. secret split at every relevant chunk boundary;
4. two secrets where only the second matches;
5. duplicate secret values under different keys;
6. empty and non-secret-only environment input;
7. duplicate environment keys;
8. malformed quoted value and NUL input;
9. candidate file symlink;
10. candidate directory symlink;
11. candidate hardlink;
12. wrong owner or mode;
13. special file;
14. path escape and locator escape;
15. file replacement before open, during read, and after read;
16. content change with preserved size;
17. file added or removed during traversal;
18. short read or injected I/O failure;
19. exact zero-match full traversal;
20. confirmation that public evidence contains no secret value, key, HMAC, private path, or raw error payload.

Fixtures must use synthetic values only and must not read the real environment file.

## Adoption and review boundary

Candidate adoption is an evidence transition, not a byte copy or candidate mutation. It is allowed only when:

- the exact checkpoint and all frozen hashes still match;
- the permission boundary and authorized single secret read succeeded;
- the exhaustive scan covered the exact candidate set;
- exact-value match count is 0;
- all structural and race counters are 0;
- the public privacy scanner reports findings 0.

The adopted evidence must then be included in a fresh executable dependency manifest. Only after that manifest is frozen may the explicitly delegated provenance, runtime, and security reviewers receive the same exact bytes. Reviewers remain read-only with zero secret reads, provider calls, or mutations. One rejection or unresolved finding returns the lineage to `GATE_C_HOLD`; only 3/3 `ACCEPT` permits the conditional post-review scope.

## Operations performed by this audit

- Real secret-file permission changes: 0
- Real secret-file reads: 0
- Candidate adoption: 0
- Reviewer dispatch: 0
- Provider API or external calls: 0
- External mutations or deployments: 0

