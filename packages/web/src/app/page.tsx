import { getDataset, getTvlSnapshot } from "../lib/data";
import { computeDataStatus } from "../lib/coverage";
import { SummaryMatrix } from "../components/SummaryMatrix";

export default function Home() {
  const { protocols, feeds, ratings, governance } = getDataset();
  const tvlSnapshot = getTvlSnapshot();
  const dataStatus = computeDataStatus(ratings, tvlSnapshot.asOf, {
    protocols: protocols.length,
    feeds: feeds.length,
  });
  return (
    <SummaryMatrix
      protocols={protocols}
      feeds={feeds}
      ratings={ratings}
      governance={governance}
      tvlSnapshot={tvlSnapshot}
      dataStatus={dataStatus}
    />
  );
}
