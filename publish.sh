#!/usr/bin/bash

tag=boxel-client
repo="lexifuzzpup/boxel-client"
version=$1
version="${version:=latest}"

docker build -t $tag -f ./Dockerfile .

docker tag $tag "${repo}:${version}"
docker push "${repo}:${version}"

docker tag $tag "${repo}:latest"
docker push "${repo}:latest"