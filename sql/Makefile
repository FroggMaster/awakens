.PHONY: help _pwd_prompt decrypt_conf encrypt_conf local_http local_https

CONF_FILE=conf/settings.json

help:
	@echo "decrypt_conf     Will decrypt the settings.json with settings"
	@echo "encrypt_conf     Will encrypt the existing settings.json"
	@echo "local_http       Will generate the settings for a local http server"
	@echo "local_https      Will generate the settings for a local https server."
	@echo "                 it will prompt you for information to generate the "
	@echo "                 self-signed ssl certificate"

# 'private' task for echoing instructions
_pwd_prompt:
	@echo "Contact admin@spooks.me for the password."

# to create conf/settings.json
decrypt_conf: _pwd_prompt
	openssl cast5-cbc -d -in ${CONF_FILE}.cast5 -out ${CONF_FILE}
	chmod 600 ${CONF_FILE}

# for updating conf/settings.json
encrypt_conf: _pwd_prompt
	openssl cast5-cbc -e -in ${CONF_FILE} -out ${CONF_FILE}.cast5

local_http:
	@echo "You should already have a mysql database created.";\
	echo "To get started you can use username \"root\" with no password.";\
	echo "Which is usually the default.";\
	read -p "Enter DB Username:" USERNAME;\
	read -p "Enter DB Password:" PASSWORD;\
	echo "{\"https\":null,\"db\":{\"user\":\"$$USERNAME\",\"password\":\"$$PASSWORD\"}}" > ./conf/settings.json

# for a local env with ssl
local_https:
	@echo "You should already have a mysql database created.";\
	echo "To get started you can use username \"root\" with no password.";\
	echo "Which is usually the default.";\
	read -p "Enter DB Username:" USERNAME;\
	read -p "Enter DB Password:" PASSWORD;\
	echo "{\"db\":{\"user\":\"$$USERNAME\",\"password\":\"$$PASSWORD\"}}" > ./conf/settings.json
	mkdir -p ssl
	@echo "Generating a new ssl key"
	openssl req -x509 -nodes -days 365 -newkey rsa:2048 -keyout ./ssl/localhost.key -out ./ssl/localhost.crt

