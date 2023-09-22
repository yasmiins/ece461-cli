import "reflect-metadata";
import { graphql } from "@octokit/graphql";

import { MetricsDataRetriever } from "../../../src/services/metrics-data-retriever";


jest.mock("@octokit/graphql");


describe("MetricsDataRetriever", () => {

    const mockToken = "GITHUB_TOKEN";
    let dataRetriever: MetricsDataRetriever;

    beforeEach(() => {
        (graphql.defaults as jest.Mock).mockReturnValue(jest.fn());
        dataRetriever = new MetricsDataRetriever(mockToken);
    });


    // TODO: Add tests for error cases
    describe("retrieveMetricsData", () => {
        it("should retrieve data for each provided GitHub URL", async () => {
            // Mocking fetch methods
            dataRetriever.fetchBusFactorData = jest.fn().mockResolvedValue("busFactorDataMock");
            dataRetriever.fetchRampUpData = jest.fn().mockResolvedValue("rampUpDataMock");
            dataRetriever.fetchCorrectnessData = jest.fn().mockResolvedValue("correctnessDataMock");
            dataRetriever.fetchResponsiveMaintainerData = jest.fn().mockResolvedValue("responsiveMaintainerDataMock");

            const result = await dataRetriever.retrieveMetricsData(Promise.resolve(["https://github.com/mockOwner/mockRepo"]));

            expect(result).toEqual([
                {
                    url: "https://github.com/mockOwner/mockRepo",
                    busFactorData: "busFactorDataMock",
                    rampUpData: "rampUpDataMock",
                    correctnessData: "correctnessDataMock",
                    responsiveMaintainerData: "responsiveMaintainerDataMock"
                }
            ]);
        });
    });


    describe("fetchBusFactorData", () => {
        it("should fetch bus factor data correctly", async () => {
            // Sample mock data for the graphql query
            const mockGraphqlResponse = {
                repository: {
                    defaultBranchRef: {
                        target: {
                            history: {
                                edges: [
                                    {node: {author: {user: {login: "user1"}}}},
                                    {node: {author: {user: {login: "user1"}}}},
                                    {node: {author: {user: {login: "user2"}}}},
                                    {node: {author: null}} // Add case for an edge without a user
                                ]
                            }
                        }
                    }
                }
            };

            (dataRetriever as any).graphqlWithAuth.mockResolvedValueOnce(mockGraphqlResponse);

            const expectedOutput = {
                repo: "mockRepo",
                contributorCommits: new Map([
                    ["user1", 2], // user1 made 2 commits
                    ["user2", 1]  // user2 made 1 commit
                ])
            };

            const result = await dataRetriever.fetchBusFactorData("mockOwner", "mockRepo");

            expect(result.repo).toEqual(expectedOutput.repo);
            expect([...result.contributorCommits.entries()])
                .toEqual([...expectedOutput.contributorCommits.entries()]);
        });
    });

    describe("fetchCorrectnessData", () => {
        it("should fetch correctness data correctly", async () => {
            // Sample mock data for the GraphQl query
            const mockGraphqlResponse = {
                repository: {
                    openIssues: {totalCount: 200},
                    closedIssues: {totalCount: 436},
                    openRequests: {totalCount: 177},
                    closedRequests: {totalCount: 245},
                    mergedRequests: {totalCount: 304}
                }
            };

            (dataRetriever as any).graphqlWithAuth.mockResolvedValueOnce(mockGraphqlResponse);

            // Define expected output
            const expectedOutput = {
                openIssues: 200,
                closedIssues: 436,
                openRequests: 177,
                closedRequests: 245,
                mergedRequests: 304
            };

            // Call fetchCorrectnessData method with mock arguments
            const result = await dataRetriever.fetchCorrectnessData("mockOwner", "mockRepo");

            // Assert that returned results match the expected output
            expect(result.openIssues).toEqual(expectedOutput.openIssues);
            expect(result.closedIssues).toEqual(expectedOutput.closedIssues);
            expect(result.openRequests).toEqual(expectedOutput.openRequests);
            expect(result.closedRequests).toEqual(expectedOutput.closedRequests);
            expect(result.mergedRequests).toEqual(expectedOutput.mergedRequests);
        });
    });

    // TODO: Add unit tests for fetchRampUpData, fetchCorrectnessData, fetchResponsiveMaintainerData


    describe("fetchResponsiveMaintainerData", () => {
        it("should fetch responsive maintainer data correctly", async () => {
            // Sample mock data for the GraphQL query
            const mockGraphqlResponse = {
                repository: {
                    issues: {
                        edges: [
                            { node: { createdAt: "2022-01-01T00:00:00Z", closedAt: "2022-01-02T00:00:00Z" } },
                            { node: { createdAt: "2022-01-02T00:00:00Z", closedAt: "2022-01-03T00:00:00Z" } },
                            { node: { createdAt: "2022-01-03T00:00:00Z", closedAt: null } } // Open issue
                        ]
                    }
                }
            };

            (dataRetriever as any).graphqlWithAuth.mockResolvedValueOnce(mockGraphqlResponse);

            // Expected output: average time to close an issue should be 24 hours (in milliseconds)
            const expectedOutput = {
                averageTimeInMillis: 24 * 60 * 60 * 1000,  // 24 hours in milliseconds
                closedIssuesExist: true
            };

            const result = await dataRetriever.fetchResponsiveMaintainerData("mockOwner", "mockRepo");

            expect(result).toEqual(expectedOutput);
        });
    });
});