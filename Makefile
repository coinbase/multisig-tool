run: compile
	python -m SimpleHTTPServer

clean:
	rm -f multisig.js

compile:
	cd lib/multisig && \
	../../node_modules/.bin/browserify -r ./vault -r ./views/addresses_view > ../../multisig.js

publish:
	git checkout gh-pages
	git reset --hard origin/master
	make compile
	git add -f multisig.js
	git commit -m "Publishing ..."
	git push --set-upstream origin gh-pages -f
	git checkout master

.PHONY: run compile publish clean
