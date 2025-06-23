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
