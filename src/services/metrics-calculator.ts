import { inject, injectable } from "tsyringe";
import { LicenseVerifier } from "./license-verifier";

import { Metrics } from "../types/metrics";


@injectable()
export class MetricsCalculator {
    constructor(
        @inject("LicenseVerifier") private licenseVerifier: LicenseVerifier
    ) {
    }


    /**
     * Calculates metrics for a list of GitHub URLs.
     *
     * TODO: Implement error handling
     *
     * @param urlsPromise
     * @param data
     */
    public async calculateMetrics(urlsPromise: Promise<string[]>, data: any[]): Promise<Metrics[]> {
        const urls = await urlsPromise;

        // Calculate metrics for each URL in parallel and return the results
        return Promise.all(urls.map(async (url, index) => {
            const urlData = data[index];
            const [
                busFactor,
                correctness,
                rampUp,
                responsiveMaintainer
            ] = await Promise.all([
                this.calculateBusFactor(urlData.busFactorData),
                this.calculateCorrectness(urlData.correctnessData),
                this.calculateRampUp(urlData.rampUpData),
                this.calculateResponsiveMaintainer(urlData.responsiveMaintainerData)
            ]);

            const license = await this.licenseVerifier.verifyLicense(url);
            const netScore = await this.calculateNetScore(busFactor, correctness, rampUp, responsiveMaintainer, license);

            return {
                Url: url,
                BusFactor: busFactor,
                Correctness: correctness,
                RampUp: rampUp,
                ResponsiveMaintainer: responsiveMaintainer,
                License: license,
                NetScore: netScore
            };
        }));
    }


    /**
     * Calculates the bus factor for a GitHub repository.
     *
     * TODO: Implement error handling
     *
     * @param busFactorData
     */
    async calculateBusFactor(busFactorData: any): Promise<number> {
        if (!busFactorData || !busFactorData.contributorCommits) {
            throw new Error("busFactorData or contributorCommits is undefined");
        }

        // Convert the busFactorData Map to an array
        const contributorArray: { contributor: string; commitCount: number }[] =
            Array.from(busFactorData.contributorCommits.entries() as [string, number][]).map(([contributor, commitCount]) => ({
                contributor,
                commitCount
            }));


        // Sort contributors by commit count in descending order
        contributorArray.sort((a, b) => b.commitCount - a.commitCount);

        // Calculate 50% of total commits
        const totalCommits = contributorArray.reduce((total, contributor) => total + contributor.commitCount, 0);
        const threshold = totalCommits * 0.5;

        // Find how many top contributors are needed to surpass the threshold
        let count = 0;
        let topContributorsCommitCount = 0;

        for (const contributor of contributorArray) {
            topContributorsCommitCount += contributor.commitCount;
            count++;

            if (topContributorsCommitCount > threshold) {
                break;
            }
        }

        return count;
    }


    async calculateCorrectness(correctnessData: any): Promise<number> {

        return 0;
    }


    async calculateRampUp(rampUpData: any): Promise<number> {

        //Initializes the RampUpScore
        let RampUpScore = 0;

        //Scores the Readme Length as a factor of the total Ramp Up
        if (rampUpData.readmeLength === 0) {
            RampUpScore = 0;
            return RampUpScore;
        } else if (rampUpData.readmeLength < 1000) { // You can adjust the threshold as needed
            RampUpScore += 0.25;
        } else {
            RampUpScore += 0.5;
        }
        //Assigns Half of the RampUpScore to how far apart the Readme Update and the Last Commit Are
        //The Score goes from 0-0.5 for a range of 1 year apart to the same
        const lastUpdatedDate = new Date(rampUpData.lastUpdated);
        const lastCommitDate = rampUpData.lastCommit ? new Date(rampUpData.lastCommit) : null;
        if (lastCommitDate) {
            // Calculate the absolute time difference in milliseconds
            const timeDifference = Math.abs(lastUpdatedDate.getTime() - lastCommitDate.getTime());

            // Define a maximum time difference (adjust as needed)
            const maxTimeDifference = 1000 * 60 * 60 * 24 * 30; // 30 days in milliseconds

            // Calculate the score based on the time difference
            RampUpScore += Math.max(0, 0.5 - timeDifference / maxTimeDifference);
        }
        
        return RampUpScore;
    }


    async calculateResponsiveMaintainer(responsiveMaintainerData: any): Promise<number> {

        return 0;
    }


    async calculateNetScore(busFactor: number, correctness: number, rampUp: number,
                            responsiveMaintainer: number, license: boolean): Promise<number> {

        const NetScore = ((responsiveMaintainer * 0.28) + (busFactor * 0.28) + (rampUp * 0.22) + (correctness * 0.22)) * (license ? 1: 0); 

        return NetScore;
    }
}
