import dotenv from "dotenv";
dotenv.config();

import "reflect-metadata";

import logger from "./utils/logger";
import { Command } from "commander";

import * as fs from "fs";

import { MetricsController } from "./controllers/metrics-controller";
import { container } from "./container"
import { exec } from "child_process";
import path from "path";


const controller = container.resolve(MetricsController);

const figlet = require("figlet");
console.log(figlet.textSync("Module Metrics"));

const program = new Command();

program
    .version("1.0.0")
    .name("./run")
    .description("A CLI tool for analyzing npm modules");

// ./run test
program
    .command("test")
    .description("Run test suite")
    .action(() => {
        logger.info("Starting test suite...");

        // Step 1: Run Jest tests
        exec("jest --coverage --coverageReporters=\"json-summary\" --json", (error, stdout, stderr) => {
            if (error) {
                logger.error(`exec error: ${error}`);
                return;
            }

            const jestResult = JSON.parse(stdout);

            const total = jestResult.numTotalTestSuites;
            const passed = jestResult.numPassedTestSuites;

            // Step 2: Read the coverage-summary.json
            const coverageSummaryPath = path.join(process.cwd(), 'coverage', 'coverage-summary.json');
            if (fs.existsSync(coverageSummaryPath)) {
                const coverageSummary = JSON.parse(fs.readFileSync(coverageSummaryPath, 'utf-8'));

                const coveragePercentage = coverageSummary.total.lines.pct;

                logger.info(`Total: ${total}`);
                logger.info(`Passed: ${passed}`);
                logger.info(`Coverage: ${coveragePercentage}%`);
                console.log(`${passed}/${total} test cases passed. ${coveragePercentage}% line coverage achieved.`);
                process.exit(0);
            } else {
                logger.error("Coverage summary not found. Ensure jest is generating the summary correctly.");
                process.exit(1);
            }
        });
    });

// ./run <URL_FILE>
program
    // URL_FILE is the absolute location of a file consisting of an ASCII-encoded newline-delimited set of URLs
    .arguments("<URL_FILE>")
    .action((urlFilePath) => {
        if (!fs.existsSync(urlFilePath)) {
            logger.error(`File not found: ${urlFilePath}`);
            process.exit(1);
        } else {
            try {
                controller.generateMetrics(urlFilePath);
                logger.info("Successfully generated metrics.");
                process.exit(0);
            } catch (error) {
                logger.error("An error occurred in generateMetrics: ", error);
                process.exit(1);
            }
        }
    });

program.parse(process.argv);