import { injectable, inject } from "tsyringe";

import { UrlFileProcessor } from "../services/url-file-processor";
import { MetricsDataRetriever } from "../services/metrics-data-retriever";
import { MetricsCalculator } from "../services/metrics-calculator";
import { Metrics } from "../types/metrics";

@injectable()
export class MetricsController {
    constructor(
        @inject("UrlFileProcessor") private urlFileProcessor: UrlFileProcessor,
        @inject("MetricsDataRetrieverToken") private metricsDataRetriever: MetricsDataRetriever,
        @inject("MetricsCalculator") private metricsCalculator: MetricsCalculator,
    ) {
    }

    public generateMetrics(urlFilePath: string): void {
        // Process URL file to get list of GitHub URLs
        const urls = this.urlFileProcessor.processUrlFile(urlFilePath);

        // Retrieve metrics data from GitHub
        const data = this.metricsDataRetriever.retrieveMetricsData(urls);

        // Calculate metrics using retrieved data
        const metrics: Metrics[] = [this.metricsCalculator.calculateMetrics(data)];

        // Output metrics to console in NDJSON format
        console.log(metrics.map(metric => JSON.stringify(metric)).join('\n'));
    }
}