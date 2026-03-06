index.js: $(shell find src -type f -name "*.ts")
	deno bundle src/index.ts -o $@

watch:
	deno bundle --watch src/index.ts -o index.js

check:
	cd src && deno check index.ts

graph:
	deno x dependency-cruiser --no-config -T dot "src/**/*.ts" | dot -T svg > graph.svg
