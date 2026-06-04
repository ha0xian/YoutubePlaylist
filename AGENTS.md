# AGENTS.md

Repository guidance for Codex Cloud code review.

## Review guidelines

- Prioritize P0/P1 findings only. Avoid comments about style, formatting, or
  speculative improvements unless they create a serious correctness, security,
  privacy, or reliability risk.
- Treat authentication and authorization regressions as high priority. Verify
  protected frontend routes stay protected and backend endpoints that handle
  user-owned data require the correct authenticated user.
- Flag any change that exposes secrets, OAuth tokens, API keys, session tokens,
  localStorage tokens, or other credentials in source, logs, browser output,
  screenshots, or API responses.
- Check that frontend API calls and backend route changes preserve existing
  request and response contracts unless the pull request intentionally changes
  them and updates all callers.
- For Django changes, verify model changes include migrations, serializers
  validate untrusted input, views avoid returning another user's data, and
  production-sensitive settings do not weaken `SECRET_KEY`, `DEBUG`,
  `ALLOWED_HOSTS`, or CORS handling.
- For React/TypeScript changes, flag runtime paths that can crash on missing
  data, stale auth state, invalid route params, or failed network requests.
- For YouTube iframe, OAuth, or external API work, flag unsafe handling of
  remote data, missing error handling for quota/network failures, and accidental
  persistence of provider tokens.
- For markdown notes rendering, flag XSS or unsafe HTML rendering risks.
- Treat generated artifacts, dependency churn, screenshots, build output,
  `node_modules/`, virtualenvs, and local database files in a pull request as
  review-worthy unless the change explicitly requires them.
