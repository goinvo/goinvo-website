# Marqueta suggestions — first live run (2026-10-02)

`POST /api/marketing/suggest` on a local dev server against the real model
(`claude-opus-4-8`) and the live CMS. Counts and timings only; the suggestion
text is not recorded here (it names internal proof points).

| source   | request                                         | wall time | kept | dropped | documents read | document problems |
|----------|-------------------------------------------------|-----------|------|---------|----------------|-------------------|
| `work`   | (none)                                          | 20 s      | 5    | 0       | —              | —                 |
| `field`  | details "clinical AI adoption"                  | 78 s      | 5    | 0       | —              | —                 |
| `custom` | brief + 1 text doc + 1 unshared Google Doc link | 13 s      | 2    | 0       | 1              | 1 (the page answered 404) |

Checks on the same run:
- Every `work` link resolved on goinvo.com (8/8 returned 200).
- Every `field` source URL was one the web search returned; that's enforced in
  `parseSuggestions`, so an invented URL would have been dropped.
- All three answers rendered through `buildSuggestionBlocks` as valid Slack
  (`expectValidSlackBlocks`), with every button value ≤ 1,900 characters and decodable.

Not exercised: the Slack event and interaction routes against a real workspace.
The card was not posted. Slack attachments need the `files:read` scope, which
the app does not have yet.
