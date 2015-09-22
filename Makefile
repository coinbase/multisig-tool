run:
	python -m SimpleHTTPServer

compile:
	cd lib/multisig && \
	browserify -r ./vault -r ./views/addresses_view > ../../multisig.js

publish:
	git checkout gh-pages
	git rebase master
	make compile
	git add multisig.js
	git commit -m "Publishing ..."
	git push --set-upstream origin gh-pages -f
	git checkout master

.PHONY: run compile publish
