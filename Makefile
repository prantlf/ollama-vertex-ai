IMAGE="ollama-vertex-ai"

all:: lint build

clean::
	docker image rm $(IMAGE)

lint::
	docker run --rm -i \
		-v ${PWD}/.hadolint.yaml:/bin/hadolint.yaml \
		-e XDG_CONFIG_HOME=/bin hadolint/hadolint \
		< Dockerfile

build::
	docker build -t $(IMAGE) .

enter::
	docker run --rm -it -p 22434:22434 --name $(IMAGE) \
		-v ${PWD}/google-account.json:/usr/src/app/google-account.json \
		-v ${PWD}/model-defaults.json:/usr/src/app/model-defaults.json \
		--entrypoint sh $(IMAGE)

start::
	docker run --rm -dt -p 22434:22434 --name $(IMAGE) \
		-v ${PWD}/google-account.json:/usr/src/app/google-account.json \
		-v ${PWD}/model-defaults.json:/usr/src/app/model-defaults.json \
		$(IMAGE)

kill::
	docker container kill $(IMAGE)

logs::
	docker logs $(IMAGE)
