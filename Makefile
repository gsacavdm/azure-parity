REGISTRY = gsacavdm
VERSION = 0.0.2
	
default:
	docker build . -t ${REGISTRY}/azparity-cloudcfg:${VERSION} -f cloudcfg/Dockerfile
	docker push ${REGISTRY}/azparity-cloudcfg:${VERSION}
	docker build . -t ${REGISTRY}/azparity-collect-rps:${VERSION} -f collect-rps/Dockerfile
	docker push ${REGISTRY}/azparity-collect-rps:${VERSION}
	docker build . -t ${REGISTRY}/azparity-upload:${VERSION} -f upload/Dockerfile
	docker push ${REGISTRY}/azparity-upload:${VERSION}