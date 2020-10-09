FROM choreoipaas/choreo-ballerina AS choreo

FROM ubuntu
WORKDIR /root/

# Copy latest ballerina distribution from choreoipaas/choreo-ballerina
COPY --from=choreo /ballerina /ballerina

# Install git
RUN apt-get update && \ 
    apt-get install -y git

# Install OpenJDK-8
RUN apt-get update && \ 
    DEBIAN_FRONTEND=noninteractive apt-get install -y openjdk-8-jdk && \
    DEBIAN_FRONTEND=noninteractive apt-get install -y ant && \
    apt-get clean;

# Fix certificate issues
RUN apt-get update && \
    apt-get install ca-certificates-java && \
    apt-get clean && \
    update-ca-certificates -f;

# Install required vscode dependencies for linux
RUN apt-get install libgtk-3-0 -y && \
    apt-get install -y libgbm-dev && \
    apt-get install libxss1 -y

# Setup JAVA_HOME
ENV JAVA_HOME /usr/lib/jvm/java-8-openjdk-amd64/
RUN export JAVA_HOME

# Install node
ENV NODE_VERSION=12.18.4
RUN apt install -y curl
RUN curl -o- https://raw.githubusercontent.com/creationix/nvm/v0.34.0/install.sh | bash
ENV NVM_DIR=/root/.nvm
RUN . "$NVM_DIR/nvm.sh" && nvm install ${NODE_VERSION}
RUN . "$NVM_DIR/nvm.sh" && nvm use v${NODE_VERSION}
RUN . "$NVM_DIR/nvm.sh" && nvm alias default v${NODE_VERSION}
ENV PATH="/root/.nvm/versions/node/v${NODE_VERSION}/bin/:${PATH}"
RUN node --version
RUN npm --version

# Clone plugin-vscode
RUN git clone https://github.com/prabushi/plugin-vscode.git

# Copy latest ballerina distribution to extractedDistribution directory
ENV BALLERINA_DISTRIBUTION_NAME=ballerina-swan-lake-preview5
RUN cd plugin-vscode && mkdir extractedDistribution && \
    cp -r /ballerina/runtime /root/plugin-vscode/extractedDistribution && \
    mv /root/plugin-vscode/extractedDistribution/runtime/ /root/plugin-vscode/extractedDistribution/${BALLERINA_DISTRIBUTION_NAME}/

# TODO Fix https://github.com/microsoft/vscode-extension-vscode/issues/143
RUN cd plugin-vscode/ && npm i && export npm_package_engines_vscode=1.34.0 && node ./node_modules/vscode/bin/install

# Execute gradle build
RUN cd plugin-vscode && ./gradlew clean build
