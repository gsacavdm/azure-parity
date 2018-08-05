REGISTRY = gsacavdm
VERSION = 0.0.3
	
default: cloudcfg collect upload process

.PHONY: cloudcfg
cloudcfg:
	docker build . -t ${REGISTRY}/azparity-cloudcfg:${VERSION} -f cloudcfg/Dockerfile
	docker push ${REGISTRY}/azparity-cloudcfg:${VERSION}

.PHONY: collect
collect: collect-rps collect-policies collect-roles collect-health collect-portalextensions collect-vmextensions

.PHONY: collect-rps
collect-rps:
	docker build . -t ${REGISTRY}/azparity-collect-rps:${VERSION} -f collect-rps/Dockerfile
	docker push ${REGISTRY}/azparity-collect-rps:${VERSION}

.PHONY: collect-policies
collect-policies:
	docker build . -t ${REGISTRY}/azparity-collect-policies:${VERSION} -f collect-policies/Dockerfile
	docker push ${REGISTRY}/azparity-collect-policies:${VERSION}

.PHONY: collect-roles
collect-roles:
	docker build . -t ${REGISTRY}/azparity-collect-roles:${VERSION} -f collect-roles/Dockerfile
	docker push ${REGISTRY}/azparity-collect-roles:${VERSION}

.PHONY: collect-health
collect-health:
	docker build . -t ${REGISTRY}/azparity-collect-health:${VERSION} -f collect-health/Dockerfile
	docker push ${REGISTRY}/azparity-collect-health:${VERSION}

.PHONY: collect-portalextensions
collect-portalextensions:
	docker build . -t ${REGISTRY}/azparity-collect-portalextensions:${VERSION} -f collect-portalextensions/Dockerfile
	docker push ${REGISTRY}/azparity-collect-portalextensions:${VERSION}

.PHONY: collect-vmextensions
collect-vmextensions:
	docker build . -t ${REGISTRY}/azparity-collect-vmextensions:${VERSION} -f collect-vmextensions/Dockerfile
	docker push ${REGISTRY}/azparity-collect-vmextensions:${VERSION}

.PHONY: upload
upload:
	docker build . -t ${REGISTRY}/azparity-upload:${VERSION} -f upload/Dockerfile
	docker push ${REGISTRY}/azparity-upload:${VERSION}

.PHONY: process
process:
	docker build . -t ${REGISTRY}/azparity-process:${VERSION} -f process/Dockerfile
	docker push ${REGISTRY}/azparity-process:${VERSION}

.PHONY: deploy
deploy: deploy-collect deploy-upload

.PHONY: deploy-collect
deploy-collect:
	kubectl get pods | grep azparity-collect | awk '{ system("kubectl delete pod " $1) }'
	find k8/ -name collect-*.yaml -exec kubectl apply -f {} \;

.PHONY: deploy-process
deploy-process:
	kubectl get pods | grep azparity-process | awk '{ system("kubectl delete pod " $1) }'
	find k8/ -name process-*.yaml -exec kubectl apply -f {} \;
