ARG BASE_NGINX_IMAGE=registry.cn-hangzhou.aliyuncs.com/fubd_own/parrot-base-nginx:1.27-alpine

FROM ${BASE_NGINX_IMAGE}

COPY infra/nginx/default.conf /etc/nginx/conf.d/default.conf
COPY apps/frontend/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
