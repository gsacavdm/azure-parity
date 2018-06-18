REGISTRY = gsacavdm
VERSION = 0.0.2
	
default: cloudcfg collect-rps upload

.PHONY: cloudcfg
cloudcfg:
	docker build . -t ${REGISTRY}/azparity-cloudcfg:${VERSION} -f cloudcfg/Dockerfile
	docker push ${REGISTRY}/azparity-cloudcfg:${VERSION}

.PHONY: collect-rps
collect-rps:
	docker build . -t ${REGISTRY}/azparity-collect-rps:${VERSION} -f collect-rps/Dockerfile
	docker push ${REGISTRY}/azparity-collect-rps:${VERSION}

.PHONY: upload
upload:
	docker build . -t ${REGISTRY}/azparity-upload:${VERSION} -f upload/Dockerfile
	docker push ${REGISTRY}/azparity-upload:${VERSION}