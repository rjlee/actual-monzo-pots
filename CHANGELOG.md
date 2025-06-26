## [1.16.2](https://github.com/rjlee/actual-monzo-pots/compare/v1.16.1...v1.16.2) (2025-06-26)


### Bug Fixes

* reset budget download flag in closeBudget function ([0b4f5d9](https://github.com/rjlee/actual-monzo-pots/commit/0b4f5d91729e2a4d50fcf942496733b0ba63fbf0))

## [1.16.1](https://github.com/rjlee/actual-monzo-pots/compare/v1.16.0...v1.16.1) (2025-06-26)


### Bug Fixes

* correct budget download flag setting in openBudget function ([8460aed](https://github.com/rjlee/actual-monzo-pots/commit/8460aed44fbf452519c172926a3bec3247500e9c))

# [1.16.0](https://github.com/rjlee/actual-monzo-pots/compare/v1.15.0...v1.16.0) (2025-06-26)


### Features

* add budget sync after pot sync with error handling ([516e230](https://github.com/rjlee/actual-monzo-pots/commit/516e230ab204890e3d152c4398f17ef9887842f1))

# [1.15.0](https://github.com/rjlee/actual-monzo-pots/compare/v1.14.0...v1.15.0) (2025-06-26)


### Features

* enhance root route to handle budget download on page load with error logging ([d56a939](https://github.com/rjlee/actual-monzo-pots/commit/d56a9398b35b9ee9213adea09b013d2a46d52ac9))

# [1.14.0](https://github.com/rjlee/actual-monzo-pots/compare/v1.13.0...v1.14.0) (2025-06-26)


### Features

* add __resetBudgetDownloadFlag helper to reset download state for testing ([21cf834](https://github.com/rjlee/actual-monzo-pots/commit/21cf834546c5b692d552c8ab2f64b9d4f10b48ca))

# [1.13.0](https://github.com/rjlee/actual-monzo-pots/compare/v1.12.0...v1.13.0) (2025-06-23)


### Features

* implement session-based authentication using cookie-session and update related tests ([90d7f12](https://github.com/rjlee/actual-monzo-pots/commit/90d7f126ad2036733ab77969895064786e129176))

# [1.12.0](https://github.com/rjlee/actual-monzo-pots/compare/v1.11.0...v1.12.0) (2025-06-23)


### Bug Fixes

* update ejs-lint command to use npx for consistency ([0f6c5f0](https://github.com/rjlee/actual-monzo-pots/commit/0f6c5f086abd5aa0548e1f21111488a257d27e6f))


### Features

* update project to support EJS templates and enhance authentication flow ([1942d6c](https://github.com/rjlee/actual-monzo-pots/commit/1942d6c935e149f446da0d275d64d8254ef43948))

# [1.11.0](https://github.com/rjlee/actual-monzo-pots/compare/v1.10.0...v1.11.0) (2025-06-23)


### Features

* enhance session-based authentication and improve login UI design ([81d468c](https://github.com/rjlee/actual-monzo-pots/commit/81d468ca8453335bd7251e98000522160ec98595))

# [1.10.0](https://github.com/rjlee/actual-monzo-pots/compare/v1.9.0...v1.10.0) (2025-06-23)


### Features

* implement session-based authentication for Web UI and update README ([15343a5](https://github.com/rjlee/actual-monzo-pots/commit/15343a54ee4485512e1a64d43fb4fecaf37e1144))
* refactor loginForm HTML generation for improved readability ([93b9832](https://github.com/rjlee/actual-monzo-pots/commit/93b98321c374dc234b5db3fa3d101863db8b2548))
* simplify openBudget function by removing runImport and directly calling downloadBudget ([51c9a06](https://github.com/rjlee/actual-monzo-pots/commit/51c9a069ceac589dc6d470c81a2c6ecaa39d1a11))
* update package.json and package-lock.json for version 1.9.0, add ejs dependency, and create HTML templates for the UI ([629185a](https://github.com/rjlee/actual-monzo-pots/commit/629185ab34c94145d513fb755c86ed7dc79bd7b0))

# [1.9.0](https://github.com/rjlee/actual-monzo-pots/compare/v1.8.0...v1.9.0) (2025-06-23)


### Features

* wrap openBudget call in Promise.resolve to handle sync errors ([be3be2c](https://github.com/rjlee/actual-monzo-pots/commit/be3be2c5e233b242f56d0421fbcb580d9a9cd091))

# [1.8.0](https://github.com/rjlee/actual-monzo-pots/compare/v1.7.0...v1.8.0) (2025-06-23)


### Features

* enhance transaction import process by adding payee lookup and creation ([0be2b10](https://github.com/rjlee/actual-monzo-pots/commit/0be2b102f0332aa5aaea49c200ac62924e593d79))

# [1.7.0](https://github.com/rjlee/actual-monzo-pots/compare/v1.6.0...v1.7.0) (2025-06-23)


### Features

* enhance README with security considerations and update sync logic for transaction imports ([4682c08](https://github.com/rjlee/actual-monzo-pots/commit/4682c0855d4e612bf25baa3f27e573fc59b0a036))

# [1.6.0](https://github.com/rjlee/actual-monzo-pots/compare/v1.5.0...v1.6.0) (2025-06-23)


### Features

* update README to include optional UI authentication setup for enhanced security ([802418a](https://github.com/rjlee/actual-monzo-pots/commit/802418a0dda51b5375ab111ad9601fef781ab6d0))

# [1.5.0](https://github.com/rjlee/actual-monzo-pots/compare/v1.4.0...v1.5.0) (2025-06-23)


### Features

* add HTTP Basic Auth to Web UI for enhanced security and implement tests for authentication ([9dd7c39](https://github.com/rjlee/actual-monzo-pots/commit/9dd7c39c32f40697b7d88c4d835c71e4856d1356))

# [1.4.0](https://github.com/rjlee/actual-monzo-pots/compare/v1.3.1...v1.4.0) (2025-06-23)


### Features

* add initial Monzo authentication status display in UI ([4b489d2](https://github.com/rjlee/actual-monzo-pots/commit/4b489d2502d944bdac55f56450db0badaceafce8))
* enhance error handling and improve UI feedback for Monzo authentication and sync processes ([c194e20](https://github.com/rjlee/actual-monzo-pots/commit/c194e209ed8414b3902838fa8ffc9848a58ff198))

## [1.3.1](https://github.com/rjlee/actual-monzo-pots/compare/v1.3.0...v1.3.1) (2025-06-22)


### Bug Fixes

* update API call parameters and enhance UI layout for better status display ([058ab9d](https://github.com/rjlee/actual-monzo-pots/commit/058ab9d1d0e96c25f13a5df9682ce7dec35fb1c0))

# [1.3.0](https://github.com/rjlee/actual-monzo-pots/compare/v1.2.0...v1.3.0) (2025-06-22)


### Features

* implement Monzo authentication checks and enhance API data handling ([3525607](https://github.com/rjlee/actual-monzo-pots/commit/3525607dbb22825c1520a1d418e509e147a76a38))

# [1.2.0](https://github.com/rjlee/actual-monzo-pots/compare/v1.1.0...v1.2.0) (2025-06-22)


### Features

* enhance budget cache management and update environment configuration ([cc6059c](https://github.com/rjlee/actual-monzo-pots/commit/cc6059c9f67cce81b5b8d88748ce84ee2c534be4))

# [1.1.0](https://github.com/rjlee/actual-monzo-pots/compare/v1.0.0...v1.1.0) (2025-06-22)


### Features

* update README to clarify OAuth redirect URL instructions ([1156936](https://github.com/rjlee/actual-monzo-pots/commit/1156936aad5ac87edcd14731b22bb7a28395cd0b))

# 1.0.0 (2025-06-22)


### Features

* add Monzo pots synchronization with Actual Budget ([ae8fdc4](https://github.com/rjlee/actual-monzo-pots/commit/ae8fdc45a6c455f65f7b2954c4c487ad5f777292))
