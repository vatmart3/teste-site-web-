"use client";
import dynamic from "next/dynamic";

const Lab = dynamic(() => import("./Lab"), { ssr: false, loading: () => <div className="fixed inset-0 bg-ink" /> });

export default function LabClient() {
  return <Lab />;
}
