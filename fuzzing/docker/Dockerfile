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

ADD . /root/truefi

WORKDIR /root/truefi/packages/contracts-carbon/

RUN pnpm install
RUN pnpm build:fuzz

ENTRYPOINT [ "./fuzzing/docker/commands.sh" ]
