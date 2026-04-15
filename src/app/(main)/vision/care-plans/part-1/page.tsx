import type { Metadata } from "next";
import { LegacyCarePlansArticle } from "../LegacyCarePlansArticle";
import "../careplans.css";

export const metadata: Metadata = {
  title: "Care Plans Part 1: Overview",
  description: "What is a care plan, and how did they start?",
};

export default function CarePlansPart1Page() {
  return <LegacyCarePlansArticle page="part1" />;
}
