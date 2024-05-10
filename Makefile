IMAGE="ollama-vertex-ai"

all: lint build

lint:
	bun run test

build:
	bun run build

start:
	bun start

docker: docker-lint docker-build

docker-clean:
	docker image rm $(IMAGE)

docker-lint:
	docker run --rm -i \
		-v ${PWD}/.hadolint.yaml:/bin/hadolint.yaml \
		-e XDG_CONFIG_HOME=/bin hadolint/hadolint \
		< Dockerfile

docker-build:
	docker build -t $(IMAGE) .

docker-enter:
	docker run --rm -it -p 22434:22434 --entrypoint sh \
		-v ${PWD}/google-account.json:/usr/src/app/google-account.json \
		-v ${PWD}/model-defaults.json:/usr/src/app/model-defaults.json \
		$(IMAGE)

docker-start:
	docker run --rm -dt -p 22434:22434 --name $(IMAGE) \
		-v ${PWD}/google-account.json:/usr/src/app/google-account.json \
		-v ${PWD}/model-defaults.json:/usr/src/app/model-defaults.json \
		$(IMAGE)

docker-kill:
	docker container kill $(IMAGE)

docker-log:
	docker logs $(IMAGE)

docker-up:
	IMAGE_HUB= docker compose -f docker-compose.yml up -d --wait

docker-down:
	IMAGE_HUB= docker compose -f docker-compose.yml down
