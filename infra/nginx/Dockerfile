ARG BASE_NGINX_IMAGE=registry.cn-hangzhou.aliyuncs.com/1997f16cd/parrot-base-nginx:1.27-alpine

FROM ${BASE_NGINX_IMAGE}

COPY infra/nginx/default.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
