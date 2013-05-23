#
# Copyright (c) 2013, Joyent, Inc. All rights reserved.
#
# Makefile: top-level Makefile
#
# This Makefile contains only repo-specific logic and uses included makefiles
# to supply common targets (javascriptlint, jsstyle, restdown, etc.), which are
# used by other repos as well.
#

#
# Tools
#
NPM		?= npm

#
# Files
#
JSON_FILES	 = package.json etc/sample.json etc/defaults.json
JS_FILES	:= $(shell find bin lib -name '*.js')
JS_FILES	+= bin/grays
JSL_FILES_NODE   = $(JS_FILES)
JSL_CONF_NODE	 = tools/jsl.node.conf
JSSTYLE_FILES	 = $(JS_FILES)

all:
	$(NPM) install

include ./tools/Makefile.targ
