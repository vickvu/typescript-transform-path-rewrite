.DEFAULT_GOAL := build
DIST_DIR := dist

.PHONY: build
build: clean $(DIST_DIR)

.PHONY: clean
clean:
	@rm -rf $(DIST_DIR)

SRC_FILES := $(shell find src)

$(DIST_DIR): node_modules tsconfig-base.json tsconfig-build.json tsconfig-build-loader.json $(SRC_FILES)
	@echo Building transformer ...
	@npx tsc -p tsconfig-build.json
	@echo "{\"type\": \"commonjs\"}" > $(DIST_DIR)/package.json
	@echo Building loader ...
	@npx tspc -p tsconfig-build-loader.json
	@echo "{\"type\": \"module\"}" > $(DIST_DIR)/loader/package.json
	@touch $@

node_modules: package-lock.json
	@npm ci
	@touch $@