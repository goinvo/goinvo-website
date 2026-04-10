import type { Metadata } from 'next'
import Image from 'next/image'
import { NewsletterForm } from '@/components/forms/NewsletterForm'
import './killer-truths.css'

export const metadata: Metadata = {
  title: 'Killer Truths',
  description:
    'How citizens of the USA really die (from 2007-2014). A data visualization exploring the leading causes of death in America.',
  openGraph: {
    title: 'Killer Truths',
    description: 'How citizens of the USA really die (from 2007-2014).',
    type: 'article',
    images: ['https://www.goinvo.com/old/images/features/killer-truths/Killer_Truths_Slide.png'],
  },
  twitter: {
    card: 'summary_large_image',
    site: '@goinvo',
    title: 'Killer Truths',
    description: 'How citizens of the USA really die (from 2007-2014).',
    images: ['https://www.goinvo.com/old/images/features/killer-truths/Killer_Truths_Slide.png'],
  },
}

export default function KillerTruthsPage() {
  return (
    <div className="killer-truths pt-[var(--spacing-header-height)]">

      {/* Hero */}
      <header className="kt-hero">
        <div className="max-w-[960px] mx-auto px-5">
          <Image
            src="https://www.goinvo.com/old/images/features/killer-truths/killer_truths_title.png"
            alt="Killer Truths"
            width={1600}
            height={400}
            className="kt-hero-img"
            style={{ width: '100%', height: 'auto' }}
            unoptimized
          />
        </div>
      </header>

      {/* Chart — accessible HTML/SVG bar chart */}
      <div className="kt-chart-wrapper">
        <p className="kt-chart-description">
          Estimated number of deaths in USA from 2007-2014.
        </p>
        <div className="max-w-[960px] mx-auto px-5">
          <table className="kt-chart-table" role="table" aria-label="Causes of death in USA 2007-2014">
            <caption className="sr-only">Estimated number of deaths in USA from 2007-2014 by cause</caption>
            <thead className="sr-only">
              <tr><th>Cause</th><th>Deaths</th></tr>
            </thead>
            <tbody>
              {[
                { name: 'Heart Disease', value: 4850000 },
                { name: 'Cancer', value: 4610000 },
                { name: 'Medical Error', value: 2010000 },
                { name: 'Chronic Lower Resp Disease', value: 1130000 },
                { name: 'Stroke', value: 1050000 },
                { name: 'Accidents', value: 1000000 },
                { name: "Alzheimer's Disease", value: 670000 },
                { name: 'Diabetes', value: 580000 },
                { name: 'Influenza, Pneumonia', value: 430000 },
                { name: 'Kidney Disease', value: 380000 },
                { name: 'Drug Overdose', value: 320000 },
                { name: 'Suicide', value: 310000 },
                { name: 'Firearm Related', value: 250000 },
                { name: 'Homicide', value: 110000 },
                { name: 'Drunk Driving', value: 90000 },
                { name: 'Terrorism', value: 52 },
              ].map((row) => {
                const widthPct = (row.value / 4850000) * 100
                return (
                  <tr key={row.name}>
                    <th scope="row" className="kt-chart-name">{row.name}</th>
                    <td className="kt-chart-value">{row.value.toLocaleString()}</td>
                    <td className="kt-chart-bar-cell" aria-hidden="true">
                      <div className="kt-chart-bar" style={{ width: `${widthPct}%` }} />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Download Bar */}
      <div className="kt-download-wrapper">
        <div className="max-w-[960px] mx-auto px-5">
          <ul className="kt-download-list">
            <li>
              <a href="https://github.com/goinvo/killertruths" target="_blank" rel="noopener noreferrer">
                <div className="dl-img">
                  <svg enableBackground="new 0 0 83.576 81.519" height="81.519px" viewBox="0 0 83.576 81.519" width="83.576px" xmlns="http://www.w3.org/2000/svg">
                    <path clipRule="evenodd" d="M41.786,0C18.709,0,0,18.715,0,41.793 c0,18.464,11.97,34.127,28.58,39.654c2.089,0.381,2.851-0.907,2.851-2.015c0-0.991-0.035-3.622-0.055-7.109 c-11.625,2.525-14.08-5.602-14.08-5.602c-1.899-4.826-4.64-6.113-4.64-6.113c-3.793-2.591,0.288-2.54,0.288-2.54 c4.194,0.295,6.401,4.309,6.401,4.309c3.728,6.384,9.781,4.54,12.161,3.473c0.381-2.701,1.46-4.545,2.656-5.587 c-9.28-1.058-19.035-4.64-19.035-20.654c0-4.564,1.628-8.292,4.299-11.214c-0.428-1.057-1.864-5.306,0.411-11.058 c0,0,3.507-1.127,11.492,4.284c3.334-0.927,6.907-1.393,10.462-1.408c3.55,0.015,7.123,0.481,10.462,1.408 c7.979-5.412,11.481-4.284,11.481-4.284c2.28,5.752,0.845,10.001,0.416,11.058c2.676,2.921,4.294,6.649,4.294,11.214 c0,16.054-9.771,19.586-19.08,20.619c1.501,1.293,2.836,3.843,2.836,7.741c0,5.587-0.05,10.092-0.05,11.464 c0,1.118,0.751,2.416,2.873,2.01c16.593-5.537,28.553-21.189,28.553-39.649C83.576,18.715,64.867,0,41.786,0z" fillRule="evenodd" fill="#FFFFFF" />
                  </svg>
                </div>
                <div className="dl-text">GitHub</div>
              </a>
            </li>
            <li>
              <a href="https://www.goinvo.com/old/images/features/killer-truths/Killer_Truths_Slide.png" target="_blank" rel="noopener noreferrer">
                <div className="dl-img">
                  <svg enableBackground="new -0.884 0 80.884 77.521" height="77.521px" viewBox="-0.884 0 80.884 77.521" width="80.884px" xmlns="http://www.w3.org/2000/svg">
                    <g>
                      <rect fill="#FFFFFF" height="9" width="80" x="-0.352" y="68.352" />
                      <path d="M68.648,32.352h-19v-25c0-5.523-0.479-7-6-7h-8c-5.523,0-6,1.477-6,7v25h-20l29.5,26.094L68.648,32.352z" fill="#FFFFFF" />
                    </g>
                  </svg>
                </div>
                <div className="dl-text">Download</div>
              </a>
            </li>
            <li>
              <a href="https://docs.google.com/spreadsheets/d/1dE0CATyI9hDNp3WlgueY7d6bJOiw7HEiyi-MEzHgDig/edit?usp=sharing" target="_blank" rel="noopener noreferrer">
                <div className="dl-img">
                  <svg enableBackground="new 0 -1.199 79.016 69.199" height="69.199px" viewBox="0 -1.199 79.016 69.199" width="79.016px" xmlns="http://www.w3.org/2000/svg">
                    <path d="M69.008-0.599h-58c-6.627,0-10.5,2.873-10.5,9.5v48c0,6.627,3.873,10.5,10.5,10.5h58 c6.627,0,9.5-3.873,9.5-10.5v-48C78.508,2.274,75.635-0.599,69.008-0.599z M20.508,57.4h-9v-9h9V57.4z M20.508,38.4h-9v-9h9V38.4z M20.508,19.401h-9v-9h9V19.401z M68.508,57.4h-38v-9h38V57.4z M68.508,38.4h-38v-9h38V38.4z M68.508,19.401h-38v-9h38V19.401z" fill="#FFFFFF" />
                  </svg>
                </div>
                <div className="dl-text">Raw Data</div>
              </a>
            </li>
            <li>
              <a href="mailto:info@goinvo.com">
                <div className="dl-img">
                  <svg enableBackground="new 0 0 83.002 59" height="59px" viewBox="0 0 83.002 59" width="83.002px" xmlns="http://www.w3.org/2000/svg">
                    <g>
                      <polygon fill="#FFFFFF" points="76.5,0.5 8.167,0.5 42,34.167" strokeMiterlimit="10" stroke="#FFFFFF" />
                      <path d="M82.5,49V9.5L42.073,49.375L0.5,8v41c0,0-0.095,2.436,2.415,6.084 C4.75,57.75,9,58.5,9,58.5h66c0,0,2.528-0.277,4.953-3.118C82.655,52.216,82.5,49,82.5,49z" fill="#FFFFFF" strokeMiterlimit="10" stroke="#FFFFFF" />
                    </g>
                  </svg>
                </div>
                <div className="dl-text">Connect</div>
              </a>
            </li>
          </ul>
        </div>
      </div>

      {/* Authors */}
      <div className="kt-authors-wrapper">
        <div className="max-w-[960px] mx-auto px-5">
          <div className="mb-12">
            <h2>Authors</h2>
            <div className="kt-author">
              <div className="auth-img">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img alt="Sharon Lee" src="https://www.goinvo.com/old/images/features/killer-truths/author_sharon.jpg" />
              </div>
              <div className="authtext">
                <p className="studio">GoInvo</p>
                <h3>Sharon Lee</h3>
                <p>Sharon is a designer with an eclectic background in engineering, medicine, and art. Passionate about healthcare, she has focused her efforts on human-centered software design. She joined Invo in 2016 with a BS in Biomedical Engineering from the University of Virginia.</p>
              </div>
            </div>
          </div>

          <div>
            <h2>Contributors</h2>
            <div className="kt-author">
              <div className="auth-img">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img alt="Jen Patel" src="https://www.goinvo.com/old/images/features/killer-truths/contributer_jen.jpg" />
              </div>
              <div className="authtext">
                <p className="studio">GoInvo</p>
                <h3>Jennifer Patel</h3>
                <p>Jennifer is a designer-developer hybrid specializing in user interface design and front-end development. She creates beautiful designs using big and small data, often for health and enterprise services. Jennifer joined Invo in 2011 and is a graduate of the Rochester Institute of Technology.</p>
              </div>
            </div>

            <div className="kt-author">
              <div className="auth-img">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img alt="Juhan Sonin" src="https://www.goinvo.com/old/images/features/killer-truths/contributer_juhan.jpg" />
              </div>
              <div className="authtext">
                <p className="studio">GoInvo</p>
                <h3>Juhan Sonin</h3>
                <p>Juhan specialized in software design and system engineering. He operates, and is the director of, GoInvo. He has worked at Apple, National Center for Supercomputing Applications, Massachusetts Institute of Technology (MIT), and MITRE. Juhan co-founded Invo Boston in 2009 and is a graduate of the University of Illinois at Urbana-Champaign. He currently lectures at MIT.</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Sources */}
      <div className="kt-sources-wrapper">
        <div className="max-w-[960px] mx-auto px-5">
          <h2>Sources</h2>
          <div className="kt-footnotes">
            <ol>
              <li>Accidents or Unintentional Injuries. (2016, September 15). Retrieved January 23, 2017, from <a href="https://www.cdc.gov/nchs/fastats/accidental-injury.htm" target="_blank" rel="noopener noreferrer">https://www.cdc.gov/nchs/fastats/accidental-injury.htm</a></li>
              <li>Alzheimer&apos;s Disease. (2015, March 05). Retrieved January 23, 2017, from <a href="https://www.cdc.gov/aging/aginginfo/alzheimers.htm" target="_blank" rel="noopener noreferrer">https://www.cdc.gov/aging/aginginfo/alzheimers.htm</a></li>
              <li>Bacterial Pneumonia. (n.d.). Retrieved January 23, 2017, from <a href="http://www.healthline.com/health/bacterial-pneumonia#RiskFactors3" target="_blank" rel="noopener noreferrer">http://www.healthline.com/health/bacterial-pneumonia#RiskFactors3</a></li>
              <li>Behaviors That Increase Risk for Stroke. (2014, March 17). Retrieved January 23, 2017, from <a href="https://www.cdc.gov/stroke/behavior.htm" target="_blank" rel="noopener noreferrer">https://www.cdc.gov/stroke/behavior.htm</a></li>
              <li>Cancer. (2015, February). Retrieved January 23, 2017, from <a href="http://www.who.int/mediacentre/factsheets/fs297/en/" target="_blank" rel="noopener noreferrer">http://www.who.int/mediacentre/factsheets/fs297/en/</a></li>
              <li>Chan, A. (2010, September 10). The 10 Deadliest Cancers and Why There&apos;s No Cure. Retrieved January 23, 2017, from <a href="http://www.livescience.com/11041-10-deadliest-cancers-cure.html" target="_blank" rel="noopener noreferrer">http://www.livescience.com/11041-10-deadliest-cancers-cure.html</a></li>
              <li>Chronic Obstructive Pulmonary Disease (COPD) Includes: Chronic Bronchitis and Emphysema. (2016, October 07). Retrieved January 23, 2017, from <a href="https://www.cdc.gov/nchs/fastats/copd.htm" target="_blank" rel="noopener noreferrer">https://www.cdc.gov/nchs/fastats/copd.htm</a></li>
              <li>Drug Poisoning Mortality: United States, 1999&ndash;2014. (2016, March 30). Retrieved January 12, 2017, from <a href="https://blogs.cdc.gov/nchs-data-visualization/drug-poisoning-mortality/" target="_blank" rel="noopener noreferrer">https://blogs.cdc.gov/nchs-data-visualization/drug-poisoning-mortality/</a></li>
              <li>Drunk driving statistics. (n.d.). Retrieved January 12, 2017, from <a href="http://www.alcoholalert.com/drunk-driving-statistics-2007.html" target="_blank" rel="noopener noreferrer">http://www.alcoholalert.com/drunk-driving-statistics-2007.html</a></li>
              <li>Drunk driving statistics. (n.d.). Retrieved January 12, 2017, from <a href="http://www.alcoholalert.com/drunk-driving-statistics-2008.html" target="_blank" rel="noopener noreferrer">http://www.alcoholalert.com/drunk-driving-statistics-2008.html</a></li>
              <li>Drunk driving statistics. (n.d.). Retrieved January 12, 2017, from <a href="http://www.alcoholalert.com/drunk-driving-statistics-2010.html" target="_blank" rel="noopener noreferrer">http://www.alcoholalert.com/drunk-driving-statistics-2010.html</a></li>
              <li>Heart disease Causes. (2014, July 29). Retrieved January 23, 2017, from <a href="http://www.mayoclinic.org/diseases-conditions/heart-disease/basics/causes/con-20034056" target="_blank" rel="noopener noreferrer">http://www.mayoclinic.org/diseases-conditions/heart-disease/basics/causes/con-20034056</a></li>
              <li>Intoxalock Ignition Interlock Device. (n.d.). Intoxalock Ignition Interlock. Retrieved January 12, 2017, from <a href="https://www.intoxalock.com/ignition-interlock-devices/statistics" target="_blank" rel="noopener noreferrer">https://www.intoxalock.com/ignition-interlock-devices/statistics</a></li>
              <li>Kochanek, K. D., M.A., Murphy, S. L., B.S., &amp; Xu, J., M.D. (2015, July 27). National Vital Statistics Report, Deaths: Final Data for 2011. Retrieved January 17, 2017, from <a href="https://www.cdc.gov/nchs/data/nvsr/nvsr63/nvsr63_03.pdf" target="_blank" rel="noopener noreferrer">https://www.cdc.gov/nchs/data/nvsr/nvsr63/nvsr63_03.pdf</a></li>
              <li>Kochanek, K. D., M.A., Murphy, S. L., B.S., Xu, J., M.D., &amp; Tejada-Vera, B., M.S. (2016, June 30). National Vital Statistics Report, Deaths: Final Data for 2014. Retrieved January 17, 2017, from <a href="https://www.cdc.gov/nchs/data/nvsr/nvsr65/nvsr65_04.pdf" target="_blank" rel="noopener noreferrer">https://www.cdc.gov/nchs/data/nvsr/nvsr65/nvsr65_04.pdf</a></li>
              <li>Kochanek, K. D., M.A., Xu, J., M.D., Murphy, S. L., B.S., et al. (2011, December 29). National Vital Statistics Report, Deaths: Final Data for 2009. Retrieved January 17, 2017, from <a href="https://www.cdc.gov/nchs/data/nvsr/nvsr60/nvsr60_03.pdf" target="_blank" rel="noopener noreferrer">https://www.cdc.gov/nchs/data/nvsr/nvsr60/nvsr60_03.pdf</a></li>
              <li>M. (n.d.). MADD - 2012 Drunk Driving Fatalities by State. Retrieved January 12, 2017, from <a href="http://www.madd.org/blog/2013/november/2012-drunk-driving-fatalities.html" target="_blank" rel="noopener noreferrer">http://www.madd.org/blog/2013/november/2012-drunk-driving-fatalities.html</a></li>
              <li>Makary, M. A., &amp; Daniel, M. (2016, May 3). Medical error&mdash;the third leading cause of death in the US. Retrieved January 12, 2017, from <a href="http://www.bmj.com/content/353/bmj.i2139" target="_blank" rel="noopener noreferrer">http://www.bmj.com/content/353/bmj.i2139</a></li>
              <li>Mini&ntilde;o, A. M., M.P.H., Murphy, S. L., B.S., Xu, J., M.D., &amp; Kochanek, K. D., M.A. (2011, December 07). National Vital Statistics Report, Deaths: Final Data for 2008. Retrieved January 17, 2017, from <a href="https://www.cdc.gov/nchs/data/nvsr/nvsr59/nvsr59_10.pdf" target="_blank" rel="noopener noreferrer">https://www.cdc.gov/nchs/data/nvsr/nvsr59/nvsr59_10.pdf</a></li>
              <li>Murphy, S. L., B.S., Kochanek, K. D., M.A., Xu, J., M.D., &amp; Heron, M., Ph.D. (2015, August 31). National Vital Statistics Report, Deaths: Final Data for 2012. Retrieved January 17, 2017, from <a href="https://www.cdc.gov/nchs/data/nvsr/nvsr63/nvsr63_09.pdf" target="_blank" rel="noopener noreferrer">https://www.cdc.gov/nchs/data/nvsr/nvsr63/nvsr63_09.pdf</a></li>
              <li>Murphy, S. L., B.S., Xu, J., &amp; M.D., Kochanek, K. D., M.A. (2013, May 8). National Vital Statistics Report, Deaths: Final Data for 2010. Retrieved January 17, 2017, from <a href="https://www.cdc.gov/nchs/data/nvsr/nvsr61/nvsr61_04.pdf" target="_blank" rel="noopener noreferrer">https://www.cdc.gov/nchs/data/nvsr/nvsr61/nvsr61_04.pdf</a></li>
              <li>National Consortium for the Study of Terrorism and Responses to Terrorism Fact Sheet: American Deaths in Terrorist Attacks [PDF]. (2015, October).</li>
              <li>Rudd, R. A., MSPH, Aleshire, N., JD, Zibbell, J. E., PhD, &amp; Gladden, M. R., PhD. (2016, January 01). Increases in Drug and Opioid Overdose Deaths &mdash; United States, 2000&ndash;2014. Retrieved January 23, 2017, from <a href="https://www.cdc.gov/mmwr/preview/mmwrhtml/mm6450a3.htm?s_cid=mm6450a3_w#tab" target="_blank" rel="noopener noreferrer">https://www.cdc.gov/mmwr/preview/mmwrhtml/mm6450a3.htm</a></li>
              <li>Statistics About Diabetes. (2016, December 12). Retrieved January 23, 2017, from <a href="http://www.diabetes.org/diabetes-basics/statistics/" target="_blank" rel="noopener noreferrer">http://www.diabetes.org/diabetes-basics/statistics/</a></li>
              <li>Tobacco-Related Mortality. (2016, December 01). Retrieved January 12, 2017, from <a href="https://www.cdc.gov/tobacco/data_statistics/fact_sheets/health_effects/tobacco_related_mortality/" target="_blank" rel="noopener noreferrer">https://www.cdc.gov/tobacco/data_statistics/fact_sheets/health_effects/tobacco_related_mortality/</a></li>
              <li>Xu, J., M.D., Kochanek, K. D., M.A., Murphy, S. L., B.S., &amp; Tejada-Vera, B., B.S. (2010, May 20). National Vital Statistics Report, Deaths: Final Data for 2007. Retrieved January 17, 2017, from <a href="https://www.cdc.gov/nchs/data/nvsr/nvsr58/nvsr58_19.pdf" target="_blank" rel="noopener noreferrer">https://www.cdc.gov/nchs/data/nvsr/nvsr58/nvsr58_19.pdf</a></li>
              <li>Xu, J., M.D., Murphy, S. L., B.S., Kochanek, K. D., M.A., &amp; Bastian, B. A., B.S. (2016, February 16). National Vital Statistics Report, Deaths: Final Data for 2013. Retrieved January 17, 2017, from <a href="https://www.cdc.gov/nchs/data/nvsr/nvsr64/nvsr64_02.pdf" target="_blank" rel="noopener noreferrer">https://www.cdc.gov/nchs/data/nvsr/nvsr64/nvsr64_02.pdf</a></li>
            </ol>
          </div>
        </div>
      </div>

      {/* Newsletter */}
      <section className="bg-gray-lightest py-8">
        <div className="max-width max-width-md content-padding mx-auto">
          <div className="bg-white shadow-card py-6 px-4 md:px-8">
            <NewsletterForm />
          </div>
        </div>
      </section>
    </div>
  )
}
