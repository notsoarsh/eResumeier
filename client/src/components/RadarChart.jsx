import { Radar, RadarChart as RechartsRadar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Legend, ResponsiveContainer } from 'recharts';

const DIMENSION_LABELS = {
  python: 'Python',
  javascript: 'JavaScript',
  sql: 'SQL',
  machine_learning: 'ML/AI',
  data_analysis: 'Data Analysis',
  cloud_computing: 'Cloud',
  communication: 'Communication',
  leadership: 'Leadership',
  problem_solving: 'Problem Solving',
  years_experience: 'Experience',
  education_level: 'Education',
  project_management: 'Project Mgmt',
};

const DIMENSIONS = Object.keys(DIMENSION_LABELS);

/**
 * Radar Chart comparing candidate vector vs job vector
 * Report Section 5.4: "Full-page dimensional score visualisation with a radar chart
 * comparing the candidate's feature vector against the job requirements vector"
 */
function RadarChartComponent({ candidateVector, jobVector, candidateName, jobName }) {
  if (!candidateVector || !jobVector) return null;

  const data = DIMENSIONS.map((dim, i) => ({
    dimension: DIMENSION_LABELS[dim],
    candidate: candidateVector[i] || 0,
    job: jobVector[i] || 0,
  }));

  return (
    <div style={{ width: '100%', height: 400 }}>
      <ResponsiveContainer>
        <RechartsRadar cx="50%" cy="50%" outerRadius="70%" data={data}>
          <PolarGrid stroke="#334155" />
          <PolarAngleAxis dataKey="dimension" tick={{ fill: '#94a3b8', fontSize: 11 }} />
          <PolarRadiusAxis angle={30} domain={[0, 10]} tick={{ fill: '#64748b', fontSize: 10 }} />
          <Radar
            name={candidateName || 'Candidate'}
            dataKey="candidate"
            stroke="#60a5fa"
            fill="#60a5fa"
            fillOpacity={0.3}
          />
          <Radar
            name={jobName || 'Job'}
            dataKey="job"
            stroke="#a78bfa"
            fill="#a78bfa"
            fillOpacity={0.2}
          />
          <Legend wrapperStyle={{ color: '#e2e8f0', fontSize: 12 }} />
        </RechartsRadar>
      </ResponsiveContainer>
    </div>
  );
}

export default RadarChartComponent;
