VERSION = 0.0.2
	
default:
	docker build . -t ${REGISTRY}/azparity-cloudcfg:${VERSION} -f cloudcfg/Dockerfile
	docker push ${REGISTRY}/azparity-cloudcfg:${VERSION}
	docker build collect-rps -t ${REGISTRY}/azparity-collect-rps:${VERSION} -f collect-rps/Dockerfile
	docker push ${REGISTRY}/azparity-collect-rps:${VERSION}
	docker build process-rps -t ${REGISTRY}/azparity-process-rps:${VERSION} -f process-rps/Dockerfile
	docker push ${REGISTRY}/azparity-process-rps:${VERSION}