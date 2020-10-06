import ballerina/io;
import ballerina/http;
import ballerina/lang.'int;

public function main() {
    // The in-scope variables can be accessed by the workers inside the `fork` block.
    http:Client httpClient = new ("https://api.mathjs.org");
    // The `fork` block allows you to spawn (fork) multiple workers
    // within any execution flow of a Ballerina program.
    fork {
        worker w1 returns int {
            var response = checkpanic httpClient->get("/v4/?expr=2*3");
            return checkpanic 'int:fromString(
                checkpanic response.getTextPayload());
        }
        worker w2 returns int {
            var response = checkpanic httpClient->get("/v4/?expr=9*4");
            return checkpanic 'int:fromString(
                checkpanic response.getTextPayload());
        }
    }

    // Workers are visible outside the `fork` as futures.
    // The `wait` action will wait for both `w1` and `w2` workers to finish.
    record {int w1; int w2;} result = wait {w1, w2};

    // The resulting record contains returned values from each worker with
    // the field name as the worker name (if a field name is not provided).
    io:println("Result: ", result);
}
