import "reflect-metadata";
import { MetricsCalculator } from "../../../src/services/metrics-calculator";
import { LicenseVerifier } from "../../../src/services/license-verifier";


jest.mock("../../../src/services/license-verifier");

describe("MetricsCalculator", () => {
    let metricsCalculator: MetricsCalculator;
    let mockLicenseVerifier: jest.Mocked<LicenseVerifier>;

    beforeEach(() => {
        mockLicenseVerifier = new LicenseVerifier() as jest.Mocked<LicenseVerifier>;
        mockLicenseVerifier.verifyLicense.mockResolvedValue(true);
        metricsCalculator = new MetricsCalculator(mockLicenseVerifier);
    });

    describe("calculateMetrics", () => {
        it("should calculate metrics for provided GitHub data", async () => {

            // Mocking calculate methods
            metricsCalculator.calculateBusFactor = jest.fn().mockResolvedValue(0.25);
            metricsCalculator.calculateCorrectness = jest.fn().mockResolvedValue(0.50);
            metricsCalculator.calculateRampUp = jest.fn().mockResolvedValue(0.75);
            metricsCalculator.calculateResponsiveMaintainer = jest.fn().mockResolvedValue(0.15);
            metricsCalculator.calculateNetScore = jest.fn().mockResolvedValue(0.60);

            const mockData = [
                {
                    busFactorData: {contributorCommits: new Map([["user1", 50], ["user2", 50]])},
                    correctnessData: {},
                    rampUpData: {},
                    responsiveMaintainerData: {averageTimeInMillis: 1000, closedIssuesExist: true}
                }
            ];

            const urlsPromise = Promise.resolve(["https://github.com/mockOwner/mockRepo"]);

            const result = await metricsCalculator.calculateMetrics(urlsPromise, mockData);

            expect(result).toEqual([
                {
                    Url: "https://github.com/mockOwner/mockRepo",
                    BusFactor: 0.25,
                    Correctness: 0.50,
                    RampUp: 0.75,
                    ResponsiveMaintainer: 0.15,
                    License: true,
                    NetScore: 0.60
                }
            ]);
        });
    });


    describe("calculateBusFactor", () => {
        it("should calculate for 2 contributors with equal commits", async () => {
            const busFactorData = {contributorCommits: new Map([["user1", 50], ["user2", 50]])};
            const result = await metricsCalculator.calculateBusFactor(busFactorData);
            expect(result).toBeCloseTo(0.5);
        });

        it("should calculate for 3 contributors with varied commits", async () => {
            const busFactorData = {contributorCommits: new Map([["user1", 20], ["user2", 30], ["user3", 50]])};
            const result = await metricsCalculator.calculateBusFactor(busFactorData);
            expect(result).toBeCloseTo(0.33);
        });

        it("should throw error for undefined contributorCommits", async () => {
            await expect(metricsCalculator.calculateBusFactor({}))
                .rejects.toThrow("busFactorData or contributorCommits is undefined");
        });
    });

    describe("calculateResponsiveMaintainer", () => {
        it("should calculate for averageTimeInMillis = 1000 and closedIssuesExist = true", async () => {
            // Mock average time in milliseconds (15 days)
            const responsiveMaintainerData = {averageTimeInMillis: 1296000000, closedIssuesExist: true};
            const result = await metricsCalculator.calculateResponsiveMaintainer(responsiveMaintainerData);
            expect(result).toBeCloseTo(Math.exp(-0.5));
        });
    });

    describe("calculateCorrectness", () => {
        it("should calculate for more closed issues (than open issues) and more closed/merged requests (than open requests)", async () => {
            const correctnessData = {openIssues: 24, closedIssues: 58, openRequests: 88, closedRequests: 91, mergedRequests: 122};
            const result = await metricsCalculator.calculateCorrectness(correctnessData);
            expect(result).toEqual(0.8);
        });

        it("should calculate for more open issues (than closed issues) and more open requests (than closed/merged requests)", async () => {
            const correctnessData = {openIssues: 101, closedIssues: 56, openRequests: 88, closedRequests: 22, mergedRequests: 40};
            const result = await metricsCalculator.calculateCorrectness(correctnessData);
            expect(result).toEqual(0.45);
        });

        it("should calculate for more closed issues (than open issues) and more open requests (than closed/merged requests)", async () => {
            const correctnessData = {openIssues: 4, closedIssues: 13, openRequests: 42, closedRequests: 10, mergedRequests: 12};
            const result = await metricsCalculator.calculateCorrectness(correctnessData);
            expect(result).toEqual(0.7);
        });

        it("should calculate for 0 issues (open and closed) and 0 requests (open, closed, and merged)", async () => {
            const correctnessData = {openIssues: 0, closedIssues: 0, openRequests: 0, closedRequests: 0, mergedRequests: 0};
            const result = await metricsCalculator.calculateCorrectness(correctnessData);
            expect(result).toEqual(1);
        });
    });

    // TODO: Add tests for calculateCorrectness, calculateRampUp, calculateResponsiveMaintainer, calculateNetScore
});