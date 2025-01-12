```markdown
# JMeter CLI - Automated Performance Testing

## Overview

The **JMeter CLI** is an automation tool designed to streamline the execution of JMeter scripts. It provides a command-line interface for running performance tests, managing configurations, and generating detailed test reports.

## Key Features

- Easy selection of test modules and sub-modules.
- Configurable user input for performance parameters like number of users, ramp-up period, and loop count.
- Automated result generation in CSV and HTML formats.
- Flexible directory structure for scripts, data files, and output files.

---

## Installation

Install the CLI globally via [npm](https://www.npmjs.com/) to make it available as a command-line tool:

```bash
npm install -g jmeter-cli
```

---

## Configuration

The `config.json` file defines server settings, script paths, and data file mappings. Below is an example:

```json
{
  "server_ip": "<your_server_ip>",
  "scripts": [
    {
      "name": "Client",
      "scriptPath": "jmeter_scripts/client.jmx",
      "csvFileName": "client.csv"
    },
    {
      "name": "Corporate Events",
      "subScripts": [
        {
          "name": "Equity Rights",
          "scriptPath": "jmeter_scripts/corporate_events/equity_rights.jmx",
          "csvFileName": "corporate_events/equity_rights.csv"
        }
      ]
    }
  ]
}
```

- **`server_ip`**: Replace with the IP of the target server.
- **`scriptPath`**: Path to the `.jmx` file.
- **`csvFileName`**: Input file used by the script.

---

## Usage

Run the CLI using the `jmeter-cli` command:

1. Start the CLI:
   ```bash
   jmeter-cli
   ```

2. Follow the prompts:
   - **Select a module**: Choose a main test script.
   - **Select a sub-script** *(if applicable)*.
   - **Enter test parameters**: Number of users, ramp-up period, and loop count.

3. The CLI runs the JMeter test and generates output files in the `output_files/` directory.

---

## Example

```bash
jmeter-cli
```

**Prompt Interaction**:
1. Select a module: `Report Dashboard`
2. Select a sub-module: `Report Dashboard - PowerBI`
3. Enter the number of users: `100`
4. Enter the ramp-up period: `60`
5. Enter the loop count: `10`

**Output**:
- CSV file: `output_files/CSV Output/Report Dashboard/Report Dashboard - PowerBI_2025-01-12.csv`
- HTML file: `output_files/HTML Output/Report Dashboard/Report Dashboard - PowerBI_2025-01-12.html`

---

## Dependencies

This CLI uses the following packages:

- [chalk](https://www.npmjs.com/package/chalk): For styled terminal output.
- [inquirer](https://www.npmjs.com/package/inquirer): For interactive prompts.
- [cheerio](https://www.npmjs.com/package/cheerio): For parsing JMX files.
- [ora](https://www.npmjs.com/package/ora): For loading spinners.

Install dependencies:
```bash
npm install
```

---

## Contributing

We welcome contributions! If you have ideas or bug fixes, please submit a pull request or open an issue.

---

### Suggestions or changes you'd like in this?