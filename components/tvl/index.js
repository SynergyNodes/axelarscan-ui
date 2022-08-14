import { useState, useEffect } from 'react'
import { useSelector, shallowEqual } from 'react-redux'
import _ from 'lodash'
import { TailSpin, ThreeDots } from 'react-loader-spinner'

import Datatable from '../datatable'
import Image from '../image'
import { chainName, getChain } from '../../lib/object/chain'
import { getDenom } from '../../lib/object/denom'
import { currency_symbol } from '../../lib/object/currency'
import { number_format, equals_ignore_case, loader_color } from '../../lib/utils'

export default () => {
  const { preferences, evm_chains, cosmos_chains, assets, tvl } = useSelector(state => ({ preferences: state.preferences, evm_chains: state.evm_chains, cosmos_chains: state.cosmos_chains, assets: state.assets, tvl: state.tvl }), shallowEqual)
  const { theme } = { ...preferences }
  const { evm_chains_data } = { ...evm_chains }
  const { cosmos_chains_data } = { ...cosmos_chains }
  const { assets_data } = { ...assets }
  const { tvl_data } = { ...tvl }

  const [data, setData] = useState(null)

  useEffect(() => {
    if (evm_chains_data && cosmos_chains_data && assets_data && Object.keys({ ...tvl_data }).length > 5) {
      const chains_data = _.concat(evm_chains_data, cosmos_chains_data)
      setData(_.orderBy(
        Object.entries(tvl_data).map(([k, v]) => {
          const {
            total_on_evm,
            total_on_cosmos,
            total,
            tvl,
          } = { ...v }
          let {
            price,
          } = { ...v }
          price = typeof price === 'number' ? price : -1
          return {
            ...v,
            asset_data: getDenom(k, assets_data),
            value_on_evm: price * (total_on_evm || 0),
            value_on_cosmos: price * (total_on_cosmos || 0),
            value: price * (total || 0),
            native: Object.entries({ ...tvl }).map(([k, v]) => {
              return {
                chain: k,
                chain_data: getChain(k, chains_data),
                ...v,
              }
            }).find(c => c?.contract_data?.is_native || c?.denom_data?.is_native),
          }
        }),
        ['value'], ['desc']
      ))
    }
  }, [evm_chains_data, cosmos_chains_data, assets_data, tvl_data])

  const staging = process.env.NEXT_PUBLIC_SITE_URL?.includes('staging')

  return (
    data ?
      <div className="space-y-2">
        <Datatable
          columns={_.orderBy(_.concat([
            {
              Header: 'Asset',
              accessor: 'asset_data',
              sortType: (a, b) => a.original.value > b.original.value ? 1 : -1,
              Cell: props => {
                const {
                  name,
                  symbol,
                  image,
                } = { ...props.value }
                return (
                  <div className={`min-w-max flex items-${name ? 'start' : 'center'} space-x-2`}>
                    {image && (
                      <Image
                        src={image}
                        className="w-5 h-5 rounded-full"
                      />
                    )}
                    <div className="flex flex-col">
                      <div className="text-xs font-bold">
                        {name || symbol}
                      </div>
                      {name && symbol && (
                        <div className="text-slate-400 dark:text-slate-500 text-xs font-semibold">
                          {symbol}
                        </div>
                      )}
                    </div>
                  </div>
                )
              },
              headerClassName: 'w-34',
              className: 'bg-violet-50 dark:bg-slate-900 bg-opacity-90 dark:bg-opacity-90 sticky left-0 z-50',
              order: 0,
            },
            {
              Header: 'Native',
              accessor: 'native',
              sortType: (a, b) => (a.original.native?.supply || a.original.native?.total || -1) * (a.original.price || 0) > (b.original.native?.supply || b.original.native?.total || -1) * (b.original.price || 0) ? 1 : -1,
              Cell: props => {
                const {
                  asset_data,
                  price,
                } = { ...props.row.original }
                const {
                  chain_data,
                  contract_data,
                  denom_data,
                  escrow_addresses,
                  supply,
                  total,
                  url,
                } = { ...props.value }
                const {
                  image,
                } = { ...chain_data }
                const {
                  denom,
                } = { ...denom_data }
                const amount = supply || total
                const value = amount * price
                const has_asset = amount || contract_data || (escrow_addresses?.length > 0 && denom)
                const amount_exact_formatted = number_format(amount, '0,0.000000')
                const amount_formatted = number_format(amount, amount > 100000 ? '0,0.00a' : amount > 10000 ? '0,0.00' : '0,0.00000000')
                return (
                  <div className="flex flex-col items-start sm:items-end space-y-0">
                    {has_asset ?
                      url ?
                        <a
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          title={amount_exact_formatted}
                          className="uppercase text-blue-500 dark:text-blue-400 text-xs font-bold"
                        >
                          {amount_formatted}
                        </a> :
                        <span
                          title={amount_exact_formatted}
                          className="uppercase text-slate-400 dark:text-slate-400 text-xs font-bold"
                        >
                          {amount_formatted}
                        </span> :
                      <span>
                        -
                      </span>
                    }
                    {has_asset && typeof price === 'number' && (
                      <span
                        title={number_format(value, `${currency_symbol}0,0.000`)}
                        className="uppercase text-slate-800 dark:text-slate-200 text-2xs font-medium"
                      >
                        {currency_symbol}
                        {number_format(value, value > 1000000 ? '0,0.00a' : value > 10000 ? '0,0' : '0,0.00')}
                      </span>
                    )}
                    {has_asset && (
                      <div className="min-w-max flex items-center space-x-1.5">
                        {image && (
                          <Image
                            src={image}
                            className="w-4 h-4 rounded-full"
                          />
                        )}
                        <span className="text-2xs">
                          {chainName(chain_data)}
                        </span>
                      </div>
                    )}
                  </div>
                )
              },
              headerClassName: 'w-34 whitespace-nowrap justify-start sm:justify-end normal-case text-black dark:text-white font-extrabold text-left sm:text-right',
              className: 'bg-slate-50 dark:bg-slate-900 bg-opacity-90 dark:bg-opacity-90 sticky left-40 z-40',
              order: 1,
            },
            {
              Header: 'Total Supply',
              accessor: 'value',
              sortType: (a, b) => a.original.value > b.original.value ? 1 : -1,
              Cell: props => {
                const {
                  asset_data,
                  total,
                } = { ...props.row.original }
                const {
                  symbol,
                } = { ...asset_data }
                return (
                  <div className="flex flex-col items-start sm:items-end space-y-0.5">
                    {typeof total === 'number' ?
                      <span
                        title={number_format(total, '0,0.00000000')}
                        className="uppercase text-slate-500 dark:text-slate-400 text-xs font-semibold"
                      >
                        {number_format(total, total > 100000 ? '0,0.00a' : total > 10000 ? '0,0.00' : '0,0.000000')}
                        <span className="normal-case ml-1">
                          {symbol}
                        </span>
                      </span> :
                      <span>
                        -
                      </span>
                    }
                    {typeof total === 'number' && props.value > -1 && (
                      <span
                        title={number_format(props.value, `${currency_symbol}0,0.000`)}
                        className="uppercase text-sm font-bold"
                      >
                        {currency_symbol}
                        {number_format(props.value, props.value > 1000000 ? '0,0.00a' : props.value > 10000 ? '0,0.00' : '0,0.000000')}
                      </span>
                    )}
                  </div>
                )
              },
              headerClassName: 'whitespace-nowrap justify-start sm:justify-end normal-case text-black dark:text-white font-extrabold text-left sm:text-right',
              className: 'bg-green-50 dark:bg-slate-900 bg-opacity-90 dark:bg-opacity-90 sticky left-80 z-40',
              order: 2,
            },
            {
              Header: 'Moved to EVM',
              accessor: 'value_on_evm',
              sortType: (a, b) => a.original.value_on_evm > b.original.value_on_evm ? 1 : -1,
              Cell: props => {
                const {
                  asset_data,
                  total_on_evm,
                } = { ...props.row.original }
                const {
                  symbol,
                } = { ...asset_data }
                return (
                  <div className="flex flex-col items-start sm:items-end space-y-0">
                    {typeof total_on_evm === 'number' ?
                      <span
                        title={number_format(total_on_evm, '0,0.00000000')}
                        className="uppercase text-slate-400 dark:text-slate-500 text-2xs font-medium -mt-0.5"
                      >
                        {number_format(total_on_evm, total_on_evm > 100000 ? '0,0.00a' : total_on_evm > 10000 ? '0,0.00' : '0,0.000000')}
                        <span className="normal-case ml-1">
                          {symbol}
                        </span>
                      </span> :
                      <span>
                        -
                      </span>
                    }
                    {typeof total_on_evm === 'number' && props.value > -1  && (
                      <span
                        title={number_format(props.value, `${currency_symbol}0,0.000`)}
                        className="uppercase text-slate-800 dark:text-slate-200 text-xs font-semibold"
                      >
                        {currency_symbol}
                        {number_format(props.value, props.value > 1000000 ? '0,0.00a' : props.value > 10000 ? '0,0.00' : '0,0.000000')}
                      </span>
                    )}
                  </div>
                )
              },
              headerClassName: 'whitespace-nowrap justify-start sm:justify-end normal-case text-black dark:text-white font-extrabold text-left sm:text-right',
              className: 'bg-zinc-100 dark:bg-zinc-900 sticky z-30',
              order: 3,
            },
            {
              Header: 'Moved to Cosmos',
              accessor: 'value_on_cosmos',
              sortType: (a, b) => a.original.value_on_cosmos > b.original.value_on_cosmos ? 1 : -1,
              Cell: props => {
                const {
                  asset_data,
                  total_on_cosmos,
                } = { ...props.row.original }
                const {
                  symbol,
                } = { ...asset_data }
                return (
                  <div className="flex flex-col items-start sm:items-end space-y-0">
                    {typeof total_on_cosmos === 'number' ?
                      <span
                        title={number_format(total_on_cosmos, '0,0.00000000')}
                        className="uppercase text-slate-400 dark:text-slate-500 text-2xs font-medium -mt-0.5"
                      >
                        {number_format(total_on_cosmos, total_on_cosmos > 100000 ? '0,0.00a' : total_on_cosmos > 10000 ? '0,0.00' : '0,0.000000')}
                        <span className="normal-case ml-1">
                          {symbol}
                        </span>
                      </span> :
                      <span>
                        -
                      </span>
                    }
                    {typeof total_on_cosmos === 'number' && props.value > -1 && (
                      <span
                        title={number_format(props.value, `${currency_symbol}0,0.000`)}
                        className="uppercase text-slate-800 dark:text-slate-200 text-xs font-semibold"
                      >
                        {currency_symbol}
                        {number_format(props.value, props.value > 1000000 ? '0,0.00a' : props.value > 10000 ? '0,0.00' : '0,0.000000')}
                      </span>
                    )}
                  </div>
                )
              },
              headerClassName: 'whitespace-nowrap justify-start sm:justify-end normal-case text-black dark:text-white font-extrabold text-left sm:text-right',
              className: 'bg-zinc-100 dark:bg-zinc-900 sticky z-20',
              order: 4,
            },
          ],
          _.concat(evm_chains_data || [], cosmos_chains_data || []).map((c, i) => {
            const {
              id,
              image,
            } = { ...c }
            return {
              Header: (
                <div className="min-w-max flex items-center space-x-1.5">
                  {image && (
                    <Image
                      src={image}
                      className="w-4 h-4 rounded-full"
                    />
                  )}
                  <span className="text-2xs">
                    {chainName(c)}
                  </span>
                </div>
              ),
              accessor: `tvl.${id}`,
              sortType: (a, b) => (a.original.tvl?.[id]?.supply || a.original.tvl?.[id]?.total || -1) * (a.original.price || 0) > (b.original.tvl?.[id]?.supply || b.original.tvl?.[id]?.total || -1) * (b.original.price || 0) ? 1 : -1,
              Cell: props => {
                const {
                  asset_data,
                  price,
                  tvl,
                } = { ...props.row.original }
                const {
                  contract_data,
                  denom_data,
                  escrow_addresses,
                  supply,
                  total,
                  url,
                } = { ...tvl?.[id] }
                const {
                  denom,
                } = { ...denom_data }
                const amount = supply || total
                const value = amount * price
                const has_asset = amount || contract_data || (escrow_addresses?.length > 0 && denom)
                const amount_exact_formatted = number_format(amount, '0,0.000000')
                const amount_formatted = number_format(amount, amount > 100000 ? '0,0.00a' : amount > 10000 ? '0,0.00' : '0,0.00000000')
                return (
                  <div className="flex flex-col items-start sm:items-end space-y-0">
                    {has_asset ?
                      url ?
                        <a
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          title={amount_exact_formatted}
                          className="uppercase text-blue-500 dark:text-blue-400 text-xs font-bold"
                        >
                          {amount_formatted}
                        </a> :
                        <span
                          title={amount_exact_formatted}
                          className="uppercase text-slate-400 dark:text-slate-400 text-xs font-bold"
                        >
                          {amount_formatted}
                        </span> :
                      <span>
                        -
                      </span>
                    }
                    {has_asset && typeof price === 'number' && (
                      <span
                        title={number_format(value, `${currency_symbol}0,0.000`)}
                        className="uppercase text-slate-800 dark:text-slate-200 text-2xs font-medium"
                      >
                        {currency_symbol}
                        {number_format(value, value > 1000000 ? '0,0.00a' : value > 10000 ? '0,0' : '0,0.00')}
                      </span>
                    )}
                  </div>
                )
              },
              headerClassName: 'whitespace-nowrap justify-start sm:justify-end text-left sm:text-right',
              order: 5 + i + (cosmos_chains_data.findIndex(_c => _c?.id === id) > -1 ? 1 : 0),
            }
          })), ['order'], ['asc'])}
          data={data}
          noPagination={data.length <= 50}
          noRecordPerPage={true}
          defaultPageSize={50}
          pageSizes={[50]}
          className="no-border block-table"
        />
        {data && data.length < assets_data?.filter(a => !a?.is_staging || staging).length && (
          <ThreeDots
            color={loader_color(theme)}
            width="32"
            height="32"
          />
        )}
      </div>
      :
      <div className="h-full flex items-center justify-start">
        <TailSpin
          color={loader_color(theme)}
          width="40"
          height="40"
        />
      </div>
  )
}