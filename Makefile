.PHONY: all build

SEO-WIZZARD_VERSION=0.1.1

all: build push helm-install

build:
	docker build --platform linux/arm64 --tag seo-wizzard:${SEO-WIZZARD_VERSION} .

helm-install:
	helm upgrade seo-wizzard ./charts/seo-wizzard --install --history-max 2

push: 
	docker tag seo-wizzard:${SEO-WIZZARD_VERSION} seowizzard/404-redirect:${SEO-WIZZARD_VERSION}
	docker push seowizzard/404-redirect:${SEO-WIZZARD_VERSION}