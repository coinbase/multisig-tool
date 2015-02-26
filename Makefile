run:
	gem install thin && \
	ruby -rrack -e "include Rack; Handler::Thin.run Builder.new { run Directory.new '' }"

compile:
	cd lib/multisig && \
	browserify -r ./vault -r ./views/addresses_view > ../../multisig.js

.PHONY: run compile publish
