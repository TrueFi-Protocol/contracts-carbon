FROM trailofbits/echidna

RUN export apt update && \
    apt -y upgrade && \
    apt -y install curl && \
    rm -rf /var/cache/apt/lists

RUN curl -fsSL https://deb.nodesource.com/setup_14.x | bash -

RUN apt update && \
    apt -y install git && \
    apt -y install nodejs && \
    rm -rf /var/cache/apt/lists

RUN npm install -g pnpm@7.5.0

WORKDIR /root

ADD contracts contracts
ADD fuzzing/docker/package.json package.json
ADD hardhat.config.ts .
ADD abi-exporter.js .
ADD .mocharc.json .
ADD .compiler.json .
ADD fuzzing fuzzing
ADD fuzzing/docker/commands.sh commands.sh

RUN pnpm install
RUN pnpm build

ENTRYPOINT [ "./commands.sh" ]
