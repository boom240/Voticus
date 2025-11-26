using Microsoft.AspNetCore.Mvc;
using Voticus.Api.Models;

namespace Voticus.Api.Controllers; // <- keep this; project is Voticus.Api

[ApiController]
[Route("api/[controller]")]
public class PollsController : ControllerBase
{
    // GET /api/polls
    [HttpGet]
    public ActionResult<IEnumerable<PollDto>> GetPolls()
    {
        var populatedPolls = Polls.Select(p => p with { Entries = null });

        return Ok(populatedPolls);
    }

    // GET /api/polls/{id}
    [HttpGet("{id:int}")]
    public ActionResult<PollDto> GetPollById(int id)
    {
        var poll = Polls.SingleOrDefault(p => p.Id == id);
        if (poll is null)
            return NotFound();

        var pollEntries = Entries
            .Where(e => e.PollId == id)
            .ToList();

        return Ok(poll with { Entries = pollEntries });
    }

    // POST /api/polls/{pollId}/entries
    [HttpPost("{pollId:int}/entries")]
    public ActionResult<EntryDto> CreateEntry(int pollId, [FromBody] CreateEntryRequest request)
    {
        var poll = Polls.SingleOrDefault(p => p.Id == pollId);
        if (poll is null)
            return NotFound($"Poll {pollId} not found.");

        var nextId = Entries.Count == 0 ? 1 : Entries.Max(e => e.Id) + 1;

        var entry = new EntryDto(
            Id: nextId,
            PollId: pollId,
            Description: request.Description,
            ImageUrl: request.ImageUrl,
            VoteCount: 0
        );

        Entries.Add(entry);

        return CreatedAtAction(
            nameof(GetPollById),
            new { id = pollId },
            entry
        );
    }

    // POST /api/polls/{pollId}/entries/{entryId}/vote
    [HttpPost("{pollId:int}/entries/{entryId:int}/vote")]
    public IActionResult VoteForEntry(int pollId, int entryId)
    {
        var poll = Polls.SingleOrDefault(p => p.Id == pollId);
        if (poll is null)
            return NotFound($"Poll {pollId} not found.");

        var entry = Entries.SingleOrDefault(e => e.Id == entryId && e.PollId == pollId);
        if (entry is null)
            return NotFound($"Entry {entryId} not found in poll {pollId}.");

        var updated = entry with { VoteCount = entry.VoteCount + 1 };

        // replace in list
        var index = Entries.FindIndex(e => e.Id == entryId);
        Entries[index] = updated;

        return NoContent();
    }

    [HttpPost]
    public ActionResult<PollDto> CreatePoll([FromBody] CreatePollRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Title))
            return BadRequest("Title is required.");

        var nextId = Polls.Count == 0 ? 1 : Polls.Max(p => p.Id) + 1;

        // enforce UTC
        var finishUtc = request.FinishAtUtc?.ToUniversalTime();

        var newPoll = new PollDto(
            Id: nextId,
            Title: request.Title,
            Description: request.Description,
            ImageUrl: request.ImageUrl,
            FinishAtUtc: finishUtc,
            Entries: new List<EntryDto>()
        );

        Polls.Add(newPoll);

        return CreatedAtAction(
            nameof(GetPollById),
            new { id = newPoll.Id },
            newPoll
        );
    }

    // In-memory dummy data for now
    private static readonly List<PollDto> Polls = new()
    {
        new PollDto(
            Id: 1,
            Title: "Best Programming Language",
            Description: "Vote for your favourite language.",
            ImageUrl: null,
            FinishAtUtc: DateTime.UtcNow.AddDays(7)
        ),
        new PollDto(
            Id: 2,
            Title: "Best Pet",
            Description: "Cats vs Dogs vs Others",
            ImageUrl: null,
            FinishAtUtc: DateTime.UtcNow.AddDays(3)
        )
    };

    private static readonly List<EntryDto> Entries = new()
    {
        new EntryDto(
            Id: 1,
            PollId: 1,
            Description: "C#",
            ImageUrl: null,
            VoteCount: 3
        ),
        new EntryDto(
            Id: 2,
            PollId: 1,
            Description: "Python",
            ImageUrl: null,
            VoteCount: 5
        ),
        new EntryDto(
            Id: 3,
            PollId: 1,
            Description: "JavaScript",
            ImageUrl: null,
            VoteCount: 2
        ),
        new EntryDto(
            Id: 4,
            PollId: 2,
            Description: "Cats",
            ImageUrl: null,
            VoteCount: 4
        ),
        new EntryDto(
            Id: 5,
            PollId: 2,
            Description: "Dogs",
            ImageUrl: null,
            VoteCount: 6
        )
    };
}