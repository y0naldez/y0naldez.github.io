---
title: "CJCA: Blue Team Lab for Practicing Alert Triage"
description: "Aurelius Blue Alert Lab, a defensive and synthetic lab inspired by the Blue Team part of CJCA, designed to practice alert analysis, logs, and Kibana."
pubDate: 2026-06-26T12:00:00-06:00
heroImage: '../../../assets/cjca_blue.png'
lang: "en"
category: "CJCA"
---

In this post, I want to share a lab I created to practice the defensive part of CJCA from a safe, synthetic, and alert-analysis-focused approach.

The lab is called **Aurelius Blue Alert Lab** and is designed to practice alert triage in **Elastic/Kibana**. The scenario simulates **Aurelius Labs**, a fictional company where the analyst's objective is to review a set of alerts and classify them as **True Positive** or **False Positive** using evidence found in the logs.

The main idea is simple: events are loaded into Elastic, alerts are reviewed in Kibana, related logs are investigated, and each classification is justified with concrete evidence.

> **Important note:**  
> This lab **does not contain information from the real CJCA exam**. It does not replicate official alerts, use real certification infrastructure, or expose questions, flags, scenarios, credentials, or evidence belonging to the exam.
>
> Its purpose is to serve as a practice resource for improving methodology, log analysis, Kibana usage, and defensive evidence writing.

---

## Why create a Blue Team lab for CJCA?

When practicing for hands-on security certifications, the main focus is often exploitation, enumeration, initial access, or privilege escalation. However, in assessments like CJCA, it is also important to know how to analyze events from a defensive point of view.

The Blue Team part is not just about marking an alert as true or false. It also requires reviewing evidence, correlating events, understanding the observed behavior, and explaining why an alert represents real malicious activity or why it corresponds to noise, benign activity, or insufficient evidence.

That is why I decided to create a lab that makes it possible to practice that analysis logic without relying on real exam content.

The goal is for you to face a controlled scenario where you need to answer questions such as:

- What alert was generated?
- Which host is involved?
- Which user appears in the events?
- What happened before and after the alert timestamp?
- Are there suspicious processes, connections, authentications, or changes?
- Does the evidence confirm malicious activity?
- Should the alert be classified as True Positive or False Positive?
- How can I justify my answer clearly?

This type of practice helps develop defensive judgment, not just command memorization.

---

## What is Aurelius Blue Alert Lab?

**Aurelius Blue Alert Lab** is a defensive and completely fictional lab for practicing alert analysis in **Elastic/Kibana**.

The scenario simulates a company called **Aurelius Labs**. Inside the environment, you will find an event dataset that you can load into Elasticsearch and later investigate from Kibana. Based on those logs, your objective will be to review the lab alerts and classify them as **True Positive** or **False Positive**, always using concrete evidence to justify each decision.

The lab includes a total of **20 alerts**. Each one was designed so you can practice the investigation process: reviewing events, applying filters, correlating information, validating suspicious behavior, and explaining why an alert should be considered true or false.

With this practice, you can reinforce skills such as:

- Navigating Kibana Discover.
- Searching for events by timestamps and time windows.
- Filtering by host, user, process, IP, or event type.
- Correlating related events.
- Identifying noise or false positives.
- Validating suspicious activity with evidence.
- Writing defensive conclusions clearly.

The idea is not simply to solve an isolated challenge, but to practice the full investigation flow you would normally follow when analyzing alerts inside a SIEM environment.

---

## Difference Compared to Conventional Sherlocks

Sherlocks are an excellent way to practice Blue Team, forensic analysis, DFIR, and detection. However, this lab has a different objective.

**Aurelius Blue Alert Lab** was created as a CJCA-style preparation resource so you can practice alert classification logic in a format closer to an evidence-based defensive review.

The difference is not that this lab is "better" than a Sherlock, but rather the approach it proposes:

- You will work with **20 alerts** that must be classified as **True Positive** or **False Positive**.
- The analysis is performed over evidence available in logs inside **Elastic/Kibana**.
- You must justify each decision with concrete events, not just intuition.
- The scenario is completely synthetic, safe, and created only for educational purposes.
- The format is designed so you can practice methodology, event correlation, and defensive writing.

This allows you to practice the Blue Team part without depending on spoilers, copying real scenarios, or revealing sensitive certification information.

---

## Lab Repository

All lab content is available in the following repository:

<a href="https://github.com/y0naldez/cjca-soc-alert-investigation-lab.git" target="_blank" rel="noopener noreferrer">
  View repository on GitHub
</a>


```text
https://github.com/y0naldez/cjca-soc-alert-investigation-lab.git
```

Inside the repository, you will find the files needed to bring up the environment, load the events, and start the investigation in Kibana.

The main repository structure is:

```text
alerts/
dataset/
docs/
README.es.md
README.md
docker-compose.yml
```

### `alerts/`

In this folder, you will find the lab alerts and the explanation files for review.

```text
alerts.md
alerts_answer_explanations_es.md
alerts_answer_explanations_en.md
```

The main file for practice is `alerts.md`, where the 20 alerts you need to investigate are listed. The recommendation is to work through that file first without checking the answers.

The explanation files can be used at the end to compare your analysis, review your reasoning, and understand which evidence supported each classification.

### `dataset/`

In this folder, you will find the events that are loaded into Elasticsearch.

```text
index_template.json
aurelius_all_events_bulk.ndjson
```

The `index_template.json` file defines the index template/mapping, while `aurelius_all_events_bulk.ndjson` contains the lab events in a format compatible with the Elasticsearch Bulk API.

These events are the basis of the analysis. From them, you will be able to search for activity by timestamp, host, user, process, IP, event type, and other relevant fields.

### `docs/`

In this folder, you will find ingestion guides for properly loading the events into Elastic/Kibana.

```text
ingesta_elastic_kibana_es.md
elastic_kibana_ingestion_en.md
```

The documentation is available in Spanish and English so you can follow the setup and ingestion process step by step.

### `docker-compose.yml`

The lab can be brought up locally with Docker using the `docker-compose.yml` file.

This makes practice easier, since you can run Elasticsearch and Kibana without manually configuring each component from scratch.

---

## General Lab Flow

The recommended flow for completing the practice is:

1. Clone the repository.
2. Start Elasticsearch and Kibana with Docker.
3. Apply the index template.
4. Ingest the dataset events.
5. Create the Data View in Kibana.
6. Set the correct time range in Discover.
7. Review each alert from the `alerts.md` file.
8. Search for evidence in the logs.
9. Classify each alert as **True Positive** or **False Positive**.
10. Validate your answers and review the explanation for each case.

The idea is to first try to solve the lab without looking at the answers. Start by investigating the alerts directly in Kibana, review the related events, form your conclusion, and document the evidence that supports your decision.

After completing your analysis, you can compare your answers with the repository explanations or use the interactive section I prepared to validate each alert more directly.

---

## Interactive Practice

In addition to the files included in the repository, I prepared an interactive section so you can check your answers after investigating the alerts in Kibana.

The recommendation is to use it at the end of the exercise: first review the logs, classify each alert as **True Positive** or **False Positive**, and then validate your answer along with a brief explanation of the case.

<a href="/en/labs/aurelius-blue-alert-lab/" target="_blank" rel="noopener noreferrer">
  Open interactive alert practice
</a>

---



## Recommendations for Solving the Lab

My recommendation is to work through each alert as if it were part of a real report.

First, identify the alert timestamp and define an analysis window. Then filter by host, user, process, IP address, or any other relevant field. After that, review events before and after the timestamp to understand the context.

Do not limit yourself only to the event that triggered the alert. Many times, the answer is in the correlation: a login, a process executed afterward, an outbound connection, a file change, or even the absence of events that should exist if the alert were real.

It is also important to document negative searches. In Blue Team work, not finding certain evidence can also be relevant if it is explained properly.

For example, if an alert suggests brute force activity, but there are no multiple failed attempts, no multiple tested users, no repeated attempts from the same IP, and no later successful login, that absence of evidence can support a **False Positive** classification.

The key is for your conclusion not to depend only on an impression, but on an orderly review of the available events.

---

## Conclusion

**Aurelius Blue Alert Lab** is meant to serve as a practice space for developing defensive judgment, organizing investigations, and justifying decisions with realistic evidence inside a controlled environment.

Rather than solving alerts mechanically, the idea is to strengthen the way you analyze, correlate, and document what you observe in the logs.

I hope this lab helps you practice the Blue Team part of CJCA with greater confidence and build a clearer methodology for investigating alerts, justifying decisions, and documenting evidence in defensive scenarios.
