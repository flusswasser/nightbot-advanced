import StatsCard from '../StatsCard';

export default function StatsCardExample() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4">
      <StatsCard program="Windows Vista" count={42} />
      <StatsCard program="Internet Explorer" count={27} />
      <StatsCard program="Adobe Flash" count={15} />
    </div>
  );
}
