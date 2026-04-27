FROM golang:1.22-alpine AS build
WORKDIR /app

RUN apk add --no-cache ca-certificates

COPY go.mod ./
RUN go mod download

COPY . .
RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -o /bin/backend ./cmd/server

FROM alpine:3.20
RUN apk add --no-cache ca-certificates
WORKDIR /srv

COPY --from=build /bin/backend /usr/local/bin/backend

EXPOSE 8080
CMD ["backend"]
