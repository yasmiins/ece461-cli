import { injectable } from "tsyringe";
import { graphql } from "@octokit/graphql";

import { RepoIdentifier } from "../types/repo-identifier";


@injectable()
export class MetricsDataRetriever {

    private GITHUB_URL_REGEX = /github\.com\/([a-zA-Z0-9\-_]+)\/([a-zA-Z0-9\-_]+)/;
    private graphqlWithAuth: any;


    constructor(token: string) {
        this.graphqlWithAuth = graphql.defaults({
            headers: {
                authorization: `token ${token}`
            }
        });
    }


    /**
     * Retrieves metrics data for a list of GitHub URLs.
     *
     * TODO:
     *   - Handle errors
     *   - Handle rate limiting/implement retries
     *
     * @param urls List of GitHub repository URLs.
     */
    async retrieveMetricsData(urls: Promise<string[]>): Promise<any[]> {

        // Fetch data for each URL in parallel and return the results
        return Promise.all((await urls).map(async (url) => {

            // Extract owner and repo from GitHub URL
            const {owner, repo} = await this.extractGitHubInfo(url);

            // Fetch data for metrics sequentially
            // TODO: Implement throttling and change to parallel fetching
            const busFactorData = await this.fetchBusFactorData(owner, repo);
            const rampUpData = await this.fetchRampUpData(owner, repo);
            const correctnessData = await this.fetchCorrectnessData(owner, repo);
            const responsiveMaintainerData = await this.fetchResponsiveMaintainerData(owner, repo);

            return {
                url,
                busFactorData,
                rampUpData,
                correctnessData,
                responsiveMaintainerData
            };
        }));
    }


    /**
     * Fetches bus factor data for a GitHub repository.
     *
     * TODO:
     *   - Handle errors
     *   - Handle rate limiting/implement retries
     *
     * @param owner The owner of the repository.
     * @param repo The name of the repository.
     */
    async fetchBusFactorData(owner: string, repo: string): Promise<any> {

        // Get date one year ago
        const currentDate = new Date();
        const oneYearAgo = new Date(currentDate.setFullYear(currentDate.getFullYear() - 1)).toISOString();

        // Query GitHub API for contributors in the last year
        const query = `
        {
          repository(owner: "${owner}", name: "${repo}") {
            defaultBranchRef {
              target {
                ... on Commit {
                  history(since: "${oneYearAgo}") {
                    totalCount
                    edges {
                      node {
                        author {
                          user {
                            login
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
        `;

        const {repository} = await this.graphqlWithAuth(query);

        // Count the number of commits for each unique contributor using a map
        const contributorCommits = new Map();
        repository.defaultBranchRef.target.history.edges.forEach((edge: { node: { author: { user: { login: string; }; }; }; }) => {
            // Check author is not null before adding contributor to map
            if (edge.node.author?.user) {
                const contributor = edge.node.author.user.login;
                // Increment commit count for contributor
                contributorCommits.set(contributor, (contributorCommits.get(contributor) || 0) + 1);
            }
        });

        return {
            repo: repo,
            contributorCommits: contributorCommits
        };
    }


    async fetchCorrectnessData(owner: string, repo: string): Promise<any> {
      // Query GitHub API for issues and pull requests
      const query = `{
        repository(owner: "${owner}", name: "${repo}") {
          openIssues: issues(states: OPEN) {
            totalCount
          }
          closedIssues: issues(states: CLOSED) {
            totalCount
          },
          openRequests: pullRequests(states: OPEN) {
            totalCount
          },
          closedRequests: pullRequests(states: CLOSED) {
            totalCount
          },
          mergedRequests: pullRequests(states: MERGED) {
            totalCount
          }
        }
      }`;

      const {repository} = await this.graphqlWithAuth(query);

      // Check if repository is defined
      if (repository) {
        // Get total counts for issues
        const openIssues = repository.openIssues.totalCount;
        const closedIssues = repository.closedIssues.totalCount;

        // Get total counts for pull requests
        const openRequests = repository.openRequests.totalCount;
        const closedRequests = repository.closedRequests.totalCount;
        const mergedRequests = repository.mergedRequests.totalCount;

        return {
          openIssues: openIssues,
          closedIssues: closedIssues,
          openRequests: openRequests,
          closedRequests: closedRequests,
          mergedRequests: mergedRequests
        };
      }
      else {
        return null;
      }
    }


    async fetchRampUpData(owner: string, repo: string): Promise<any> {


    }


    async fetchResponsiveMaintainerData(owner: string, repo: string): Promise<any> {


    }


    /**
     * Extracts owner and repo from a GitHub URL.
     * @param url
     * @private
     */
    private async extractGitHubInfo(url: string): Promise<RepoIdentifier> {
        const urlMatch = url.match(this.GITHUB_URL_REGEX);
        if (!urlMatch) {
            throw new Error(`Invalid GitHub URL: ${url}`);
        }
        const {1: owner, 2: repo} = urlMatch;
        return {owner, repo};
    }
}