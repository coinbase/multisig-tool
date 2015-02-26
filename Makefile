run:
	gem install thin && \
	ruby -rrack -e "include Rack; Handler::Thin.run Builder.new { run Directory.new '' }"

compile:
	cd lib/multisig && \
	browserify -r ./vault -r ./views/addresses_view > ../../multisig.js

publish:
	git checkout gh-pages
	git merge master
	make compile
	git add multisig.js
	git commit -m "Publishing ..."
	git push --set-upstream origin gh-pages
	git checkout master

.PHONY: run compile publish
