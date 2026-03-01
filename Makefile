index.js: src/*.ts
	deno bundle --minify src/index.ts -o $@

watch:
	deno bundle --minify --watch src/index.ts -o index.js
