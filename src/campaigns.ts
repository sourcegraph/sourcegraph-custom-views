import { Subscription } from 'rxjs'
import * as sourcegraph from 'sourcegraph'
import { evaluateCampaignSpec } from '@sourcegraph/campaigns-client'

export const register = (): Subscription => {
    const subscription = new Subscription()
    subscription.add(
        sourcegraph.commands.registerCommand('customViews.previewCampaign', async () => {
            const match = await sourcegraph.app.activeWindow!.showInputBox({
                prompt: 'Find all matches of:',
                value: '100Mi',
            })
            if (!match) {
                return
            }
            const replacement = await sourcegraph.app.activeWindow!.showInputBox({
                prompt: 'Replace with:',
                value: '77Mi',
            })
            if (replacement === undefined) {
                return
            }

            const applyURL = await sourcegraph.app.activeWindow!.withProgress(
                { title: '**Find-replace**' },
                async reporter => {
                    reporter.next({ message: 'Searching for matching repositories...', percentage: 25 })
                    await new Promise(resolve => setTimeout(resolve, 500))
                    const repos = await getReposMatching(match)
                    reporter.next({ message: 'Computing changes in files...', percentage: 50 })

                    let percentage = 50
                    const step = 1
                    return evaluateCampaignSpec(
                        repos,
                        path => path.endsWith('.yaml') || path.endsWith('.yml'), // TODO(sqs)
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
                `[**Find-replace changes**](${applyURL}) are ready to preview and apply.`,
                sourcegraph.NotificationType.Success
            )
            console.log(applyURL)

            const relativeURL = new URL(applyURL)
            await sourcegraph.commands.executeCommand('open', `${relativeURL.pathname}${relativeURL.search}`)
        })
    )
    return subscription
}
