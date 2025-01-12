#!/usr/bin/env node
import chalk from 'chalk';
import inquirer from 'inquirer';
import { exec } from 'child_process';
import fs from 'fs';
import path from 'path';
import cheerio from 'cheerio';
import ora from 'ora';

// Function to prompt user input
const askQuestion = (query) => inquirer.prompt(query).then(answers => answers);

// Function to count lines in a CSV file
const countCsvLines = (csvFilePath) => {
  return new Promise((resolve, reject) => {
    let lineCount = 0;
    fs.createReadStream(csvFilePath)
      .on('data', (buffer) => {
        lineCount += buffer.toString().split('\n').length - 1;
      })
      .on('end', () => {
        resolve(lineCount);
      })
      .on('error', (err) => {
        reject(err);
      });
  });
};

// Function to check if JMX script contains CSV Dataset Config
const hasCsvDatasetConfig = (scriptPath) => {
  const jmxContent = fs.readFileSync(scriptPath, 'utf8');
  const $ = cheerio.load(jmxContent, { xmlMode: true });
  return $('CSVDataSet').length > 0;
};

const configPath = path.join('config', 'config.json');
let config;

try {
  config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
} catch (error) {
  console.error(chalk.red('Error reading config file:'), error.message);
  process.exit(1);
}

const createDirectoryIfNotExists = (dirPath) => {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
};

const runJMeter = async () => {
  console.log();
  console.log(chalk.underline.bold.grey(`JMETER AUTOSCRIPTS`));
  console.log(
    chalk.whiteBright(`                                                                            
     ██╗███╗   ███╗███████╗████████╗███████╗██████╗        ██████╗██╗     ██╗
     ██║████╗ ████║██╔════╝╚══██╔══╝██╔════╝██╔══██╗      ██╔════╝██║     ██║
     ██║██╔████╔██║█████╗     ██║   █████╗  ██████╔╝█████╗██║     ██║     ██║
██   ██║██║╚██╔╝██║██╔══╝     ██║   ██╔══╝  ██╔══██╗╚════╝██║     ██║     ██║
╚█████╔╝██║ ╚═╝ ██║███████╗   ██║   ███████╗██║  ██║      ╚██████╗███████╗██║
 ╚════╝ ╚═╝     ╚═╝╚══════╝   ╚═╝   ╚══════╝╚═╝  ╚═╝       ╚═════╝╚══════╝╚═╝
                                                                                                                                       
`));

  const mainChoices = [
    ...config.scripts.map(script => ({ name: script.name, value: script.name })),
    { name: 'Exit', value: 'exit' }
  ];

  const { mainScript } = await askQuestion({
    type: 'list',
    name: 'mainScript',
    message: 'Please select a module to perform JMeter testing:',
    choices: mainChoices,
    pageSize: 10
  });

  if (mainScript === 'exit') {
    process.exit(0);
  }

  let selectedScript = config.scripts.find(script => script.name === mainScript);

  if (selectedScript.subScripts) {
    const subChoices = [
      ...selectedScript.subScripts.map(subScript => ({ name: subScript.name, value: subScript.name })),
      { name: 'Exit', value: 'exit' }
    ];

    const { subScript } = await askQuestion({
      type: 'list',
      name: 'subScript',
      message: `Select a sub-script under ${mainScript}:`,
      choices: subChoices,
      pageSize: subChoices.length
    });

    if (subScript === 'exit') {
      runJMeter();
    }

    selectedScript = selectedScript.subScripts.find(sub => sub.name === subScript);
  }

  const { numUsers } = await askQuestion({
    type: 'input',
    name: 'numUsers',
    message: 'Enter the number of users:',
    validate: input => input ? true : 'This field is required'
  });

  const { rampUpPeriod } = await askQuestion({
    type: 'input',
    name: 'rampUpPeriod',
    message: 'Enter the ramp-up period (in seconds):',
    validate: input => input ? true : 'This field is required'
  });

  const { loopCount } = await askQuestion({
    type: 'input',
    name: 'loopCount',
    message: 'Enter the loop count:',
    validate: input => input ? true : 'This field is required'
  });

  let lineCount = 1; // Default line count

  const scriptPath = selectedScript.scriptPath;
  const csvDatasetConfigExists = hasCsvDatasetConfig(scriptPath);
  if (!csvDatasetConfigExists) {
    console.warn(chalk.yellow(`CSV Dataset Config not found in JMX script for ${mainScript}. Skipping line count calculation.`));
  } else {
    const csvFilePath = path.join('datafile', selectedScript.csvFileName); // Adjust path as per your actual setup
    try {
      lineCount = await countCsvLines(csvFilePath);
    } catch (error) {
      console.error(chalk.red(`Failed to calculate line count: ${error.message}`));
      process.exit(1);
    }
  }

  // Create directory for CSV outputs based on modules
  const csvOutputDir = path.join('output_files', 'CSV Output', mainScript);
  createDirectoryIfNotExists(csvOutputDir);

  const timestamp = new Date().toISOString().replace(/[-:.]/g, '_');
  const csvFile = path.join(csvOutputDir, `${selectedScript.name}_${timestamp}.csv`);

  console.log();
  console.log(chalk.cyan('Running JMeter with the following parameters:'));
  console.log();
  console.log(`${chalk.green('Script:')} ${chalk.white(selectedScript.scriptPath)}`);
  console.log(`${chalk.green('Users:')} ${chalk.white(numUsers)}`);
  console.log(`${chalk.green('Ramp-Up Period:')} ${chalk.white(rampUpPeriod)}`);
  console.log(`${chalk.green('Loop Count:')} ${chalk.white(loopCount)}`);
  console.log(`${chalk.green('CSV File:')} ${chalk.white(csvFile)}`);
  console.log();
  
  // Include server_ip in JMeter command
  const serverIp = config.server_ip;
  
  let baseCommand = `jmeter -n -t "${selectedScript.scriptPath}" -l "${csvFile}" -J csvFilePath="datafile/${selectedScript.csvFileName}" -J numUsers=${numUsers} -J rampUpPeriod=${rampUpPeriod} -J loopCount=${loopCount} -J server_ip=${serverIp}`;
  
  if (csvDatasetConfigExists) {
    baseCommand += ` -J lineCount=${lineCount}`;
  } else {
    const filename = path.basename(selectedScript.csvFileName);
    baseCommand += ` -J filename=${filename}`;
  }

  const spinner = ora({
    text: 'Running JMeter script...',
    spinner: {
      interval: 80,
      frames: ['-', '\\', '|', '/']
    },
    color: 'cyan'
  }).start();

  exec(baseCommand, async (error, stdout, stderr) => {
    spinner.stop();
    if (error) {
      console.error(chalk.red(`JMeter script execution failed: ${error.message}`));
    } else {
      console.log(chalk.green('JMeter script executed successfully!'));
      console.log();
      
      const { generateReport } = await askQuestion({
        type: 'confirm',
        name: 'generateReport',
        message: 'Do you want to generate an HTML report?',
        default: false
      });

      if (generateReport) {
        // Create directory for HTML reports based on modules and timestamp
        const htmlOutputDir = path.join('output_files', 'HTML Output', mainScript, `${mainScript}_${timestamp}`);
        createDirectoryIfNotExists(htmlOutputDir);
        
        const reportCommand = `jmeter -g "${csvFile}" -o "${htmlOutputDir}"`;
        const reportSpinner = ora({
          text: 'Generating HTML report...',
          spinner: {
            interval: 80,
            frames: ['.', 'o', 'O', '°', 'O', 'o', '.']
          },
          color: 'yellow'
        }).start();

        exec(reportCommand, (reportError, reportStdout, reportStderr) => {
          reportSpinner.stop();
          if (reportError) {
            console.error(chalk.red(`HTML report generation failed: ${reportError.message}`));
          } else {
            console.log(chalk.green('HTML report generated successfully!'));
            console.log(`${chalk.green('HTML Output Directory:')} ${chalk.white(htmlOutputDir)}`);
          }
          runJMeter();
        });
      } else {
        runJMeter();
      }
    }
  });
};

runJMeter();