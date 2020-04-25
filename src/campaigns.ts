import { Subscription } from 'rxjs'
import * as sourcegraph from 'sourcegraph'
import { executeCampaign } from '@sourcegraph/campaigns-client'

export const register = (): Subscription => {
    const subscription = new Subscription()
    subscription.add(
        sourcegraph.commands.registerCommand('customViews.createPatchSet', async () => {
            const match = await sourcegraph.app.activeWindow!.showInputBox({
                prompt: 'Find all matches of:',
                // value: 'sourcgraph',
            })
            if (!match) {
                return
            }
            const replacement = await sourcegraph.app.activeWindow!.showInputBox({
                prompt: 'Replace with:',
                // value: 'sourcegraph',
            })
            if (replacement === undefined) {
                return
            }

            const previewURL = await sourcegraph.app.activeWindow!.withProgress(
                { title: '**Find-replace**' },
                async reporter => {
                    reporter.next({ message: 'Searching for matching repositories...', percentage: 25 })
                    await new Promise(resolve => setTimeout(resolve, 500))
                    const repos = await getReposMatching(match)
                    reporter.next({ message: 'Computing changes in files...', percentage: 50 })

                    let percentage = 50
                    const step = 1
                    return executeCampaign(
                        repos,
                        path =>
                            path.endsWith('.md') ||
                            path.endsWith('.go') ||
                            path.endsWith('.ts') ||
                            path.endsWith('.tsx') ||
                            path.endsWith('.cson'),
                        (path, text) => {
                            if (!text.includes(match)) {
                                return null
                            }

                            percentage += step
                            reporter.next({ message: `Computing changes in ${path}`, percentage })
                            return text.split(match).join(replacement)
                        }
                    )
                }
            )
            await new Promise(resolve => setTimeout(resolve, 500))
            await sourcegraph.app.activeWindow!.showNotification(
                `[**Find-replace changes**](${previewURL}) are ready to preview and apply.`,
                sourcegraph.NotificationType.Success
            )
            console.log(previewURL)

            // const relativeURL = new URL(previewURL)
            // await sourcegraph.commands.executeCommand('open', `${relativeURL.pathname}${relativeURL.search}`)
        })
    )
    return subscription
}

async function getReposMatching(text: string): Promise<string[]> {
    const { data, errors } = await sourcegraph.commands.executeCommand(
        'queryGraphQL',
        `
    query FindMatches($text: String!) {
        search(query: $text, version: V2) {
            results {
                results {
                    __typename
                    ... on FileMatch {
                        repository {
                            name
                        }
                    }
                }
            }
        }
    }`,
        { text: `${text} count:9999` }
    )
    if (errors && errors.length > 0) {
        throw new Error(`GraphQL error: ${JSON.stringify(errors)}`)
    }
    return [
        ...new Set<string>(
            data.search.results.results
                .map(m => m && m.__typename === 'FileMatch' && m.repository?.name)
                .filter(x => !!x)
        ),
    ]
}
